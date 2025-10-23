import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { ModalProps } from "../types/Types";

const ModalComponent: React.FC<ModalProps> = ({
    isOpen,
    setIsOpen,
    title,
    children,
    panelClassName,
    onClose,
}) => {
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
                                    <Dialog.Title className="text-lg font-semibold text-gray-900">
                                        {title}
                                    </Dialog.Title>
                                    <button
                                        type="button"
                                        onClick={() => (onClose ? onClose() : setIsOpen(false))}
                                        className="flex h-9 w-9 items-center justify-center rounded-full bg-black/10 text-xl text-sub hover:bg-black/20"
                                        aria-label="Đóng"
                                    >
                                        ×
                                    </button>
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
