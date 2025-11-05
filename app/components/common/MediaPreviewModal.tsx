"use client";

import React, { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import Image from "next/image";
import { detectMediaTypeFromUrl } from "../../utils/media";

interface MediaAttachment {
  url: string;
  type?: "image" | "video" | "file";
  name?: string;
}

interface MediaPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  media?: MediaAttachment | null;
}

const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({ isOpen, onClose, media }) => {
  if (!media) return null;

  const type = media.type ?? detectMediaTypeFromUrl(media.url);
  const name = media.name ?? "Tệp đính kèm";

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-[1400]"
        onClose={onClose}
        data-feedback-media-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            className="fixed inset-0 bg-black/80"
            data-feedback-media-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
          />
        </Transition.Child>

        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          data-feedback-media-modal="true"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel
              className="relative flex h-full w-full items-center justify-center"
              data-feedback-media-modal="true"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer absolute right-6 top-6 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-black"
                title="Đóng"
              >
                X
              </button>
              <div className="flex max-h-[85vh] w-full max-w-5xl items-center justify-center overflow-hidden">
                {type === "video"
                  ? (
                    <video src={media.url} controls className="max-h-[80vh] w-auto rounded-lg object-contain" />
                  )
                  : (
                    <Image
                      src={media.url}
                      alt={name}
                      width={1200}
                      height={800}
                      className="max-h-[80vh] w-auto rounded-lg object-contain"
                    />
                  )}
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};

export default MediaPreviewModal;
