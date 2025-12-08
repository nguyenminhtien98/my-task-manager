import React, { ChangeEvent, useCallback, useEffect, useState } from "react";
import ModalComponent from "../common/ModalComponent";
import { RegisterOptions, useForm } from "react-hook-form";
import { FormUserValues } from "../../types/Types";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import Button from "../common/Button";
import { validateNoEmoji } from "../../utils/inputValidation";
import BrandOrbHeaderIcon from "../common/LogoComponent";
import AnimatedGradientLogo from "../common/AnimatedGradientLogo";
import * as authService from "../../services/authService";

const LoginRegisterModal: React.FC<{
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  onLoginSuccess: () => void;
}> = ({ isOpen, setIsOpen, onLoginSuccess }) => {
  const { login, loginWithGoogle, logout, user } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const emailInputRef = React.useRef<HTMLInputElement>(null);
  const nameInputRef = React.useRef<HTMLInputElement>(null);

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
    if (isOpen) {
      setTimeout(() => {
        if (isLogin) {
          emailInputRef.current?.focus();
        } else {
          nameInputRef.current?.focus();
        }
      }, 300);
    }
  }, [isOpen, isLogin]);

  useEffect(() => {
    if (!user || !isOpen) return;
    onLoginSuccess();
    setIsOpen(false);
  }, [user, isOpen, onLoginSuccess, setIsOpen]);

  const isGoogleProcessingRef = React.useRef(false);

  const handleGoogleCallback = useCallback(
    async (response: { credential: string }) => {
      if (isGoogleProcessingRef.current) {
        return;
      }

      isGoogleProcessingRef.current = true;

      try {
        await loginWithGoogle(response.credential);
        toast.success("Đăng nhập Google thành công!");
        onLoginSuccess();
        setIsOpen(false);
        reset();
        resetErrorVisibility();
      } catch (error) {
        console.error("Google login error:", error);
        const message =
          error instanceof Error ? error.message : "Đăng nhập Google thất bại";
        toast.error(message);
      } finally {
        setTimeout(() => {
          isGoogleProcessingRef.current = false;
        }, 2000);
      }
    },
    [loginWithGoogle, onLoginSuccess, setIsOpen, reset, resetErrorVisibility]
  );

  useEffect(() => {
    if (!isOpen || !isLogin) return;

    if (typeof window === "undefined") return;
    if (!window.google) return;

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.error("Google Client ID not configured");
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCallback,
      });
    } catch (error) {
      console.error("Failed to initialize Google Sign-In:", error);
    }
  }, [isOpen, isLogin, handleGoogleCallback]);

  useEffect(() => {
    if (!isOpen || !isLogin) return;
    if (typeof window === "undefined") return;

    const renderButton = () => {
      if (!window.google) {
        return false;
      }

      const buttonDiv = document.getElementById("google-signin-button-inner");
      if (!buttonDiv) return false;

      const parentWidth = buttonDiv.parentElement?.offsetWidth || buttonDiv.offsetWidth;
      if (!parentWidth || parentWidth < 100) return false;

      buttonDiv.innerHTML = "";

      try {
        window.google.accounts.id.renderButton(buttonDiv, {
          theme: "filled_black",
          size: "large",
          width: parentWidth,
          text: "signin_with",
          shape: "rectangular",
        });
        return true;
      } catch (error) {
        console.error("Failed to render Google button:", error);
        return false;
      }
    };

    const timer = setTimeout(renderButton, 200);
    return () => clearTimeout(timer);
  }, [isOpen, isLogin]);

  const onSubmit = async (data: FormUserValues) => {
    if (isLogin) {
      try {
        await login(data.email, data.password);
        toast.success("Đăng nhập thành công!");
        onLoginSuccess();
        setIsOpen(false);
        reset();
        resetErrorVisibility();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Đăng nhập thất bại";
        toast.error(message);
      }
    } else {
      try {
        await authService.register({
          email: data.email,
          password: data.password,
          name: data.name!,
        });

        toast.success("Đăng ký thành công! Vui lòng đăng nhập.");
        setIsLogin(true);
        reset();
        resetErrorVisibility();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Đăng ký thất bại";
        toast.error(message);
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
      title=""
      hiddenHeader
    >
      <div className="space-y-4">
        <div className="flex flex-col items-center justify-center gap-2 pb-2">
          <BrandOrbHeaderIcon size={60} />
          <AnimatedGradientLogo className="text-2xl font-bold" />
        </div>

        {isLogin && (
          <>
            <div
              id="google-signin-button-inner"
              className="w-full min-h-[44px] flex items-center justify-center"
              style={{ width: '100%' }}
            />

            <div className="flex items-center gap-2">
              <span className="h-px flex-1 bg-gray-300" />
              <span className="text-xs uppercase text-gray-500">Hoặc</span>
              <span className="h-px flex-1 bg-gray-300" />
            </div>
          </>
        )}
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

                  return true;
                },
              })}
              ref={(e) => {
                registerField("name").ref(e);
                nameInputRef.current = e;
              }}
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

                const emojiCheck = validateNoEmoji(trimmedValue);
                if (emojiCheck !== true) return emojiCheck;

                return true;
              },
            })}
            ref={(e) => {
              registerField("email").ref(e);
              emailInputRef.current = e;
            }}
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
