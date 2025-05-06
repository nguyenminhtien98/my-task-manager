import React, { useEffect, useState } from 'react';
import ModalComponent from './ModalComponent';
import { useForm } from 'react-hook-form';
import { FormUserValues } from '../types/taskTypes';
import { useAuth } from '../context/AuthContext';

const LoginRegisterModal: React.FC<{ isOpen: boolean; setIsOpen: (v: boolean) => void }> = ({ isOpen, setIsOpen }) => {
	const { login, logout, user } = useAuth();
	const [isLogin, setIsLogin] = useState(true);
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirm, setShowConfirm] = useState(false);
	const {
		register,
		handleSubmit,
		reset,
		watch,
		formState: { errors, isValid, isSubmitting, dirtyFields },
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

	const onSubmit = async (data: FormUserValues) => {
		if (isLogin) {
			login({ id: '1', name: 'User A', role: 'user' });
			setIsOpen(false);
		} else {
			login({ id: Date.now().toString(), name: data.name!, role: 'user' });
			setIsOpen(false);
		}
		reset();
	};

	const canSubmit = isValid && !isSubmitting;

	return (
		<ModalComponent isOpen={isOpen} setIsOpen={setIsOpen} title={isLogin ? 'Đăng nhập' : 'Đăng ký'}>
			<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
				{!isLogin && (
					<div>
						<label className="block text-sm font-medium">Tên</label>
						<input
							{...register('name', { required: 'Tên không được bỏ trống' })}
							className="mt-1 w-full p-2 border border-gray-300 rounded"
						/>
						{errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
					</div>
				)}
				<div>
					<label className="block text-sm font-medium">Email</label>
					<input
						type="email"
						placeholder="you@example.com"
						{...register('email', {
							required: 'Email không được bỏ trống',
							pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Email không hợp lệ' },
						})}
						className="mt-1 w-full p-2 border border-gray-300 rounded"
					/>
					{errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
				</div>
				<div>
					<label className="block text-sm font-medium">Mật khẩu</label>
					<div className="relative">
						<input
							placeholder="Ít nhất 6 ký tự"
							type={showPassword ? 'text' : 'password'}
							{...register('password', { required: 'Mật khẩu không được bỏ trống', minLength: { value: 6, message: 'Ít nhất 6 ký tự' } })}
							className="mt-1 w-full p-2 border border-gray-300 rounded pr-10"
						/>
						<span onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 cursor-pointer">
							{showPassword ? '🙈' : '👁️'}
						</span>
					</div>
					{errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
				</div>
				{!isLogin && (
					<div>
						<label className="block text-sm font-medium">Nhập lại mật khẩu</label>
						<div className="relative">
							<input
								placeholder="Nhập lại mật khẩu"
								type={showConfirm ? 'text' : 'password'}
								{...register('confirmPassword', {
									required: 'Vui lòng xác nhận mật khẩu',
									validate: (v) => v === watch('password') || 'Không khớp mật khẩu',
								})}
								className="mt-1 w-full p-2 border border-gray-300 rounded pr-10"
							/>
							<span onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-3 cursor-pointer">
								{showConfirm ? '🙈' : '👁️'}
							</span>
						</div>
						{errors.confirmPassword && <p className="text-red-500 text-sm">{errors.confirmPassword.message}</p>}
					</div>
				)}
				<div className="flex justify-between items-center">
					<button type="button" onClick={toggleForm} className="text-blue-600 underline text-sm">
						{isLogin ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}
					</button>
					{user && (
						<button type="button" onClick={logout} className="px-4 py-2 bg-red-500 text-white rounded cursor-pointer">
							Logout
						</button>
					)}
					<button
						type="submit"
						disabled={!canSubmit || Object.keys(dirtyFields).length === 0}
						className={`px-4 py-2 text-white rounded ${!canSubmit || Object.keys(dirtyFields).length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'}`}
					>
						{isLogin ? 'Đăng nhập' : 'Đăng ký'}
					</button>
				</div>
			</form>
		</ModalComponent>
	);
};

export default LoginRegisterModal;
