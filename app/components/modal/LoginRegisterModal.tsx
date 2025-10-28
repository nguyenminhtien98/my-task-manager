import React, { useEffect, useState } from 'react';
import ModalComponent from '../common/ModalComponent';
import { useForm } from 'react-hook-form';
import { FormUserValues } from '../../types/Types';
import { useAuth } from '../../context/AuthContext';
import { account, database } from '../../appwrite';
import { OAuthProvider, Query } from "appwrite";
import toast from 'react-hot-toast';
import { DEFAULT_THEME_GRADIENT } from '../../utils/themeColors';

const LoginRegisterModal: React.FC<{ isOpen: boolean; setIsOpen: (v: boolean) => void; onLoginSuccess: () => void; }> = ({ isOpen, setIsOpen, onLoginSuccess }) => {
	const { login, logout, user } = useAuth();
	const [isLogin, setIsLogin] = useState(true);
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirm, setShowConfirm] = useState(false);
	const [isGoogleLoading, setIsGoogleLoading] = useState(false);
	const {
		register,
		handleSubmit,
		reset,
		watch,
		formState: { errors, isValid, isSubmitting },
	} = useForm<FormUserValues>({ mode: 'onChange' });

	const toggleForm = () => {
		setIsLogin(!isLogin);
		reset();
	};

	useEffect(() => {
		if (isOpen) {
			setIsLogin(true);
			reset();
		}
	}, [isOpen, reset]);

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
		const successUrl = `${origin}/auth/callback?redirect=${encodeURIComponent(redirectPath)}`;
		const failureUrl = `${origin}/auth/failed?redirect=${encodeURIComponent(redirectPath)}`;
		try {
			await account.createOAuth2Session(OAuthProvider.Google, successUrl, failureUrl);
		} catch (error) {
			console.error("Google login error:", error);
			toast.error("Không mở được cửa sổ Google, thử lại sau.");
			setIsGoogleLoading(false);
		}
	};

	const onSubmit = async (data: FormUserValues) => {
		if (!isValid) return;
		if (isLogin) {
			try {
				await account.deleteSession('current').catch(() => { });
				await account.createEmailPasswordSession(data.email, data.password);
				const userInfo = await account.get();
				await login(userInfo.$id, userInfo.name);
				toast.success('Đăng nhập thành công!');
				onLoginSuccess();
				setIsOpen(false);
				reset();
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
			} catch (err: any) {
				toast.error(err.message || 'Đăng nhập thất bại');
			}
		} else {
			try {
				const user = await account.create(
					'unique()',
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
						role: 'user',
						themeColor: DEFAULT_THEME_GRADIENT,
					}
				);
				toast.success('Đăng ký thành công! Vui lòng đăng nhập.');
				setIsLogin(true);
				reset();
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
			} catch (err: any) {
				toast.error(err.message || 'Đăng ký thất bại');
			}
		}
	};

	const canSubmit = isValid && !isSubmitting;

	return (
		<ModalComponent isOpen={isOpen} setIsOpen={setIsOpen} title={isLogin ? 'Đăng nhập' : 'Đăng ký'}>
			<div className="space-y-4">
				<button
					type="button"
					onClick={handleGoogleLogin}
					disabled={isGoogleLoading}
					className={`w-full flex items-center justify-center gap-2 rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600 ${isGoogleLoading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
						}`}
				>
					{isGoogleLoading ? 'Đang mở Google...' : 'Đăng nhập với Google'}
				</button>
				<div className="flex items-center gap-2">
					<span className="h-px flex-1 bg-gray-300" />
					<span className="text-xs uppercase text-gray-500">Hoặc</span>
					<span className="h-px flex-1 bg-gray-300" />
				</div>
			</div>
			<form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
				{!isLogin && (
					<div>
						<label className="block text-sm font-medium text-sub">Tên</label>
						<input
							placeholder="Nhập tên người dùng"
							{...register('name', {
								required: 'Tên không được bỏ trống',
								validate: async (value?: string) => {
									// Nếu giá trị không có (undefined hoặc rỗng) thì bạn có thể trả về lỗi hoặc true,
									// tuy nhiên nếu có rule required thì chỉ cần trả về true trong trường hợp này
									if (!value) return true;
									try {
										const res = await database.listDocuments(
											String(process.env.NEXT_PUBLIC_DATABASE_ID),
											String(process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE),
											[Query.equal("name", value)]
										);
										if (res.documents.length > 0) {
											return "Tên đã tồn tại trong hệ thống";
										}
										return true;
									} catch (error) {
										console.error("Error checking username uniqueness:", error);
										return "Lỗi hệ thống, vui lòng thử lại";
									}
								}
							})}
							className="mt-1 w-full p-2 border border-black rounded text-black"

						/>
						{errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
					</div>
				)}
				<div>
					<label className="block text-sm font-medium text-sub">Email</label>
					<input
						type="email"
						placeholder="you@example.com"
						{...register('email', {
							required: 'Email không được bỏ trống',
							pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Email không hợp lệ' },
						})}
						className="mt-1 w-full p-2 border border-black rounded text-black"
					/>
					{errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
				</div>
				<div>
					<label className="block text-sm font-medium text-sub">Mật khẩu</label>
					<div className="relative">
						<input
							placeholder="Ít nhất 6 ký tự"
							type={showPassword ? 'text' : 'password'}
							{...register('password', { required: 'Mật khẩu không được bỏ trống', minLength: { value: 6, message: 'Ít nhất 6 ký tự' } })}
							className="mt-1 w-full p-2 border border-black rounded text-black pr-10"
						/>
						<span onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 cursor-pointer">
							{showPassword ? '🙈' : '👁️'}
						</span>
					</div>
					{errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
				</div>
				{!isLogin && (
					<div>
						<label className="block text-sm font-medium text-sub">Nhập lại mật khẩu</label>
						<div className="relative">
							<input
								placeholder="Nhập lại mật khẩu"
								type={showConfirm ? 'text' : 'password'}
								{...register('confirmPassword', {
									required: 'Vui lòng xác nhận mật khẩu',
									validate: (v) => v === watch('password') || 'Không khớp mật khẩu',
								})}
								className="mt-1 w-full p-2 border border-black rounded text-black pr-10"
							/>
							<span onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-3 cursor-pointer">
								{showConfirm ? '🙈' : '👁️'}
							</span>
						</div>
						{errors.confirmPassword && <p className="text-red-500 text-sm">{errors.confirmPassword.message}</p>}
					</div>
				)}
				<div className="flex justify-between items-center">
					<button type="button" onClick={toggleForm} className="text-blue-600 underline text-sm cursor-pointer">
						{isLogin ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}
					</button>
					{user && (
						<button type="button" onClick={logout} className="px-4 py-2 bg-red-500 text-white rounded cursor-pointer">
							Logout
						</button>
					)}
					<button
						type="submit"
						disabled={!canSubmit}
						className={`px-4 py-2 rounded text-white ${!canSubmit ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
							}`}
					>
						{isLogin ? (isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập')
							: (isSubmitting ? 'Đang đăng ký...' : 'Đăng ký')}
					</button>
				</div>
			</form>
		</ModalComponent>
	);
};

export default LoginRegisterModal;
