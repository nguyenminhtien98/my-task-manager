import React, { ChangeEvent, useCallback, useEffect, useState } from "react";
import ModalComponent from "../common/ModalComponent";
import { RegisterOptions, useForm } from "react-hook-form";
import { FormUserValues } from "../../types/Types";
import { useAuth } from "../../context/AuthContext";
import { account, database } from "../../../lib/appwrite";
import { OAuthProvider } from "appwrite";
import toast from "react-hot-toast";
import { useUserValidation } from "../../hooks/useUserValidation";
import Button from "../common/Button";
import { FcGoogle } from "react-icons/fc";
import { localizeAuthError } from "../../utils/authErrors";
import { validateNoEmoji } from "../../utils/inputValidation";

const LoginRegisterModal: React.FC<{
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  onLoginSuccess: () => void;
}> = ({ isOpen, setIsOpen, onLoginSuccess }) => {
  const { login, logout, user } = useAuth();
  const { checkEmailExists, checkNameExists } = useUserValidation();

  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormUserValues>({ mode: "onChange" });
  const [showErrors, setShowErrors] = useState(false);
  const [clearedFields, setClearedFields] = useState<
    Partial<Record<keyof FormUserValues, boolean>>
  >({});

  const resetErrorVisibility = useCallback(() => {
    setShowErrors(false);
    setClearedFields({});
  }, []);

  const registerField = useCallback(
    <T extends keyof FormUserValues>(
      name: T,
      options?: RegisterOptions<FormUserValues, T>
    ) => {
      const field = register(name, options);
      return {
        ...field,
        onChange: (event: ChangeEvent<HTMLInputElement>) => {
          if (showErrors && clearedFields[name] !== true) {
            setClearedFields((prev) => ({ ...prev, [name]: true }));
          }
          field.onChange(event);
        },
      };
    },
    [clearedFields, register, showErrors]
  );

  const getFieldError = useCallback(
    (field: keyof FormUserValues) => {
      if (!showErrors || clearedFields[field]) return null;
      return errors[field]?.message ?? null;
    },
    [clearedFields, errors, showErrors]
  );

  const toggleForm = () => {
    setIsLogin(!isLogin);
    reset();
    resetErrorVisibility();
  };

  useEffect(() => {
    if (isOpen) {
      setIsLogin(true);
      reset();
      resetErrorVisibility();
    }
  }, [isOpen, reset, resetErrorVisibility]);

  useEffect(() => {
    if (!user || !isOpen) return;
    onLoginSuccess();
    setIsOpen(false);
  }, [user, isOpen, onLoginSuccess, setIsOpen]);

  const handleGoogleLogin = async () => {
    if (typeof window === "undefined") return;
    setIsGoogleLoading(true);
    const origin = window.location.origin;
    const redirectPath = window.location.pathname + window.location.search;
    const successUrl = `${origin}/auth/callback?redirect=${encodeURIComponent(
      redirectPath
    )}`;
    const failureUrl = `${origin}/auth/failed?redirect=${encodeURIComponent(
      redirectPath
    )}`;
    try {
      await account.createOAuth2Session(
        OAuthProvider.Google,
        successUrl,
        failureUrl
      );
    } catch (error) {
      console.error("Google login error:", error);
      toast.error("Không mở được cửa sổ Google, thử lại sau.");
      setIsGoogleLoading(false);
    }
  };

  const onSubmit = async (data: FormUserValues) => {
    if (isLogin) {
      try {
        await account.deleteSession("current").catch(() => {});
        await account.createEmailPasswordSession(data.email, data.password);
        const userInfo = await account.get();
        await login(userInfo.$id, userInfo.name);
        toast.success("Đăng nhập thành công!");
        onLoginSuccess();
        setIsOpen(false);
        reset();
        resetErrorVisibility();
      } catch (error) {
        toast.error(localizeAuthError(error, "Đăng nhập thất bại"));
      }
    } else {
      try {
        const user = await account.create(
          "unique()",
          data.email,
          data.password,
          data.name!
        );

        await database.createDocument(
          String(process.env.NEXT_PUBLIC_DATABASE_ID),
          String(process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE),
          user.$id,
          {
            user_id: user.$id,
            name: data.name,
            email: data.email,
            role: "user",
          }
        );

        toast.success("Đăng ký thành công! Vui lòng đăng nhập.");
        setIsLogin(true);
        reset();
        resetErrorVisibility();
      } catch (error) {
        toast.error(localizeAuthError(error, "Đăng ký thất bại"));
      }
    }
  };

  const handleFormSubmit = handleSubmit(
    async (data) => {
      resetErrorVisibility();
      await onSubmit(data);
    },
    () => {
      setShowErrors(true);
      setClearedFields({});
    }
  );

  const emailValue = watch("email");
  const passwordValue = watch("password");
  const nameValue = watch("name");
  const confirmPasswordValue = watch("confirmPassword");

  const hasLoginInput =
    Boolean(emailValue?.trim()) && Boolean(passwordValue?.trim());
  const hasRegisterInput =
    hasLoginInput &&
    Boolean(nameValue?.trim()) &&
    Boolean(confirmPasswordValue?.trim());

  const canSubmit =
    !isSubmitting && (isLogin ? hasLoginInput : hasRegisterInput);

  return (
    <ModalComponent
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      title={isLogin ? "Đăng nhập" : "Đăng ký"}
    >
      <div className="space-y-4">
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isGoogleLoading}
          className={`flex w-full items-center justify-center gap-3 rounded-lg border border-black/10 bg-black/80 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-black focus:outline-none focus-visible:ring-2 focus-visible:ring-black/40 ${isGoogleLoading ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
        >
          {isGoogleLoading ? (
            "Đang mở Google..."
          ) : (
            <>
              <FcGoogle className="text-lg" />
              <span>Đăng nhập với Google</span>
            </>
          )}
        </button>

        <div className="flex items-center gap-2">
          <span className="h-px flex-1 bg-gray-300" />
          <span className="text-xs uppercase text-gray-500">Hoặc</span>
          <span className="h-px flex-1 bg-gray-300" />
        </div>
      </div>

      <form onSubmit={handleFormSubmit} className="mt-4 space-y-4">
        {!isLogin && (
          <div>
            <label className="block text-sm font-medium text-sub">Tên</label>
            <input
              placeholder="Nhập tên người dùng"
              {...registerField("name", {
                required: "Tên không được bỏ trống",
                minLength: {
                  value: 3,
                  message: "Tên phải có ít nhất 3 ký tự",
                },
                maxLength: {
                  value: 50,
                  message: "Tên không được quá 50 ký tự",
                },
                validate: async (value?: string) => {
                  if (!value) return true;

                  const emojiCheck = validateNoEmoji(value);
                  if (emojiCheck !== true) return emojiCheck;

                  const result = await checkNameExists(value);

                  if (result.exists) {
                    return "Tên đã tồn tại trong hệ thống";
                  }

                  if (result.message) {
                    return result.message;
                  }

                  return true;
                },
              })}
              className="mt-1 w-full p-2 border border-black rounded text-black"
            />
            {getFieldError("name") && (
              <p className="text-red-500 text-sm">{getFieldError("name")}</p>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-sub">Email</label>
          <input
            type="email"
            placeholder="you@gmail.com"
            {...registerField("email", {
              required: "Email không được bỏ trống",
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: "Email không hợp lệ",
              },
              validate: async (value?: string) => {
                if (!value) return true;

                const trimmedValue = value.trim().toLowerCase();

                if (!trimmedValue.endsWith("@gmail.com")) {
                  return "Chỉ chấp nhận email Gmail (@gmail.com)";
                }

                if (!isLogin) {
                  const result = await checkEmailExists(trimmedValue);

                  if (result.exists) {
                    return "Email đã tồn tại trong hệ thống";
                  }

                  if (result.message) {
                    return result.message;
                  }
                }
                const emojiCheck = validateNoEmoji(trimmedValue);
                if (emojiCheck !== true) return emojiCheck;

                return true;
              },
            })}
            className="mt-1 w-full p-2 border border-black rounded text-black"
          />
          {getFieldError("email") && (
            <p className="text-red-500 text-sm">{getFieldError("email")}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-sub">Mật khẩu</label>
          <div className="relative">
            <input
              placeholder="Ít nhất 8 ký tự"
              type={showPassword ? "text" : "password"}
              {...registerField("password", {
                required: "Mật khẩu không được bỏ trống",
                minLength: {
                  value: 8,
                  message: "Mật khẩu phải có ít nhất 8 ký tự",
                },
                validate: (value?: string) => {
                  if (!value) return true;

                  const emojiCheck = validateNoEmoji(value);
                  if (emojiCheck !== true) return emojiCheck;

                  if (!/[A-Z]/.test(value)) {
                    return "Mật khẩu phải có ít nhất 1 chữ hoa";
                  }

                  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) {
                    return "Mật khẩu phải có ít nhất 1 ký tự đặc biệt (!@#$%^&*...)";
                  }

                  return true;
                },
              })}
              className="mt-1 w-full p-2 border border-black rounded text-black pr-10"
            />
            <span
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 cursor-pointer"
            >
              {showPassword ? "🙈" : "👁️"}
            </span>
          </div>
          {getFieldError("password") && (
            <p className="text-red-500 text-sm">
              {getFieldError("password")}
            </p>
          )}
        </div>

        {!isLogin && (
          <div>
            <label className="block text-sm font-medium text-sub">
              Nhập lại mật khẩu
            </label>
            <div className="relative">
              <input
                placeholder="Nhập lại mật khẩu"
                type={showConfirm ? "text" : "password"}
                {...registerField("confirmPassword", {
                  required: "Vui lòng xác nhận mật khẩu",
                  validate: (value?: string) => {
                    if (!value) return true;
                    const emojiCheck = validateNoEmoji(value);
                    if (emojiCheck !== true) return emojiCheck;
                    return value === watch("password")
                      ? true
                      : "Mật khẩu không khớp";
                  },
                })}
                className="mt-1 w-full p-2 border border-black rounded text-black pr-10"
              />
              <span
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-3 cursor-pointer"
              >
                {showConfirm ? "🙈" : "👁️"}
              </span>
            </div>
            {getFieldError("confirmPassword") && (
              <p className="text-red-500 text-sm">
                {getFieldError("confirmPassword")}
              </p>
            )}
          </div>
        )}

        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={toggleForm}
            className="text-blue-600 underline text-sm cursor-pointer"
          >
            {isLogin
              ? "Chưa có tài khoản? Đăng ký"
              : "Đã có tài khoản? Đăng nhập"}
          </button>

          {user && (
            <button
              type="button"
              onClick={logout}
              className="px-4 py-2 bg-red-500 text-white rounded cursor-pointer"
            >
              Logout
            </button>
          )}

          <Button
            type="submit"
            disabled={!canSubmit}
            className={`px-4 py-2 rounded text-white ${!canSubmit
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-black"
              }`}
          >
            {isLogin
              ? isSubmitting
                ? "..."
                : "Đăng nhập"
              : isSubmitting
                ? "..."
                : "Đăng ký"}
          </Button>
        </div>
      </form>
    </ModalComponent>
  );
};

export default LoginRegisterModal;
