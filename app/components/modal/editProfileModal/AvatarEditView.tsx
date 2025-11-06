"use client";

import React, { useState, useRef } from "react";
import ReactCrop, {
  type Crop,
  centerCrop,
  makeAspectCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

import Button from "../../common/Button";
import AvatarUser from "../../common/AvatarUser";

interface AvatarEditViewProps {
  imgSrc: string;
  userName: string;
  onSave: (croppedImageBlob: Blob) => void;
  isSaving?: boolean;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

const AvatarEditView: React.FC<AvatarEditViewProps> = ({
  imgSrc,
  userName,
  onSave,
  isSaving = false,
}) => {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const aspect = 1;

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, aspect));
  }

  const updatePreview = () => {
    if (
      completedCrop?.width &&
      completedCrop?.height &&
      imgRef.current &&
      previewCanvasRef.current
    ) {
      const image = imgRef.current;
      const canvas = previewCanvasRef.current;
      const crop = completedCrop;

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("No 2d context");
      }

      const croppedWidth = crop.width * scaleX;
      const croppedHeight = crop.height * scaleY;
      const MAX_SIZE = 512;
      const outputSize = Math.min(MAX_SIZE, croppedWidth, croppedHeight);
      canvas.width = outputSize;
      canvas.height = outputSize;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingQuality = "high";

      ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        outputSize,
        outputSize
      );
    }
  };

  const handleSave = () => {
    if (!previewCanvasRef.current || isSaving) {
      return;
    }
    previewCanvasRef.current.toBlob(
      (blob) => {
        if (blob) {
          onSave(blob);
        }
      },
      "image/jpeg",
      0.85
    );
  };

  React.useEffect(() => {
    updatePreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedCrop]);

  return (
    <div className="flex flex-col gap-6 p-1">
      {/* Cropper Section */}
      <div className="flex justify-center bg-gray-100 p-4 rounded-lg">
        <ReactCrop
          crop={crop}
          onChange={(_, percentCrop) => setCrop(percentCrop)}
          onComplete={(c) => {
            setCompletedCrop(c);
          }}
          aspect={aspect}
          circularCrop
          className="max-h-[400px]"
        >
          <img
            ref={imgRef}
            alt="Crop me"
            src={imgSrc}
            onLoad={onImageLoad}
            className="w-full h-auto"
          />
        </ReactCrop>
      </div>

      {/* Preview Section */}
      <div>
        <h3 className="text-sm text-gray-500 mb-2">Preview</h3>
        <div className="flex items-center gap-4 p-2 bg-gray-50 rounded-md">
          {completedCrop?.width && completedCrop?.height ? (
            <canvas
              ref={previewCanvasRef}
              style={{
                objectFit: "contain",
                width: 80,
                height: 80,
                borderRadius: "50%",
              }}
            />
          ) : (
            <AvatarUser name={userName} size={80} />
          )}
          <span className="text-lg font-semibold text-black">{userName}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-2 flex justify-end gap-3">
        <Button
          variant="solid"
          className="bg-black text-white"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? "Đang lưu..." : "Lưu"}
        </Button>
      </div>
    </div>
  );
};

export default AvatarEditView;
