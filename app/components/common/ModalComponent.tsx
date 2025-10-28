import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { FiArrowLeft } from "react-icons/fi";
import { ModalProps } from "../../types/Types";
import Button from "./Button";

const ModalComponent: React.FC<ModalProps> = ({
    isOpen,
    setIsOpen,
    title,
    children,
    panelClassName,
    onClose,
    showBackButton = false,
    onBack,
    backButtonContent,
}) => {
    const shouldShowBack = showBackButton && typeof onBack === "function";
    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[999]" onClose={() => (onClose ? onClose() : setIsOpen(false))}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300" enterFrom="opacity-0"
                    enterTo="opacity-100" leave="ease-in duration-200"
                    leaveFrom="opacity-100" leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-[1px]" />
                </Transition.Child>
                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300" enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100" leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel
                                className={`w-full ${panelClassName ?? "sm:max-w-md md:max-w-lg"
                                    } transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-xl transition-all`}
                            >
                                <div className="mb-4 flex items-center justify-between gap-4">
                                    {shouldShowBack ? (
                                        <button
                                            type="button"
                                            onClick={() => onBack && onBack()}
                                            className="cursor-pointer flex h-9 w-9 items-center justify-center rounded-full bg-black/10 text-lg text-sub hover:bg-black/20"
                                            aria-label="Quay lại"
                                        >
                                            {backButtonContent ?? <FiArrowLeft />}
                                        </button>
                                    ) : (
                                        <span className="h-9 w-9" />
                                    )}
                                    <Dialog.Title className="flex-1 text-center text-lg font-semibold text-gray-900">
                                        {title}
                                    </Dialog.Title>
                                    <Button
                                        onClick={() => (onClose ? onClose() : setIsOpen(false))}
                                        className="flex h-9 w-9 items-center justify-center rounded-full bg-black/10 text-xl text-sub hover:bg-black/20"
                                        aria-label="Đóng"
                                    >
                                        ×
                                    </Button>
                                </div>
                                {children}
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default ModalComponent;
