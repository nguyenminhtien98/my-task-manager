"use client";

import React, { useMemo, useState } from "react";
import ModalComponent from "@/app/components/common/ModalComponent";
import { Project } from "@/app/types/Types";
import ScreenSelectProject from "./ScreenSelectProject";
import ScreenProjectDetail from "./ScreenProjectDetail";

interface ProjectManagerModalProps {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
}

type Screen = "list" | "detail";

const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  isOpen,
  setIsOpen,
}) => {
  const [screen, setScreen] = useState<Screen>("list");
  const [selected, setSelected] = useState<Project | null>(null);

  const onClose = () => {
    setScreen("list");
    setSelected(null);
    setIsOpen(false);
  };

  const goBack = () => {
    if (screen === "detail") {
      setScreen("list");
      setSelected(null);
    } else {
      onClose();
    }
  };

  const title = useMemo(
    () => (screen === "detail" ? "Thông tin dự án" : "Quản lý dự án"),
    [screen]
  );

  return (
    <ModalComponent
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      title={title}
      onClose={onClose}
      showBackButton={screen === "detail"}
      onBack={goBack}
      panelClassName="sm:max-w-2xl md:max-w-3xl"
    >
      {screen === "list" && (
        <ScreenSelectProject
          onSelect={(p) => {
            setSelected(p);
            setScreen("detail");
          }}
        />
      )}
      {screen === "detail" && selected && (
        <ScreenProjectDetail
          project={selected}
          onDeleted={() => {
            setSelected(null);
            setScreen("list");
          }}
        />
      )}
    </ModalComponent>
  );
};

export default ProjectManagerModal;
