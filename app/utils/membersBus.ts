export type MembersChangedPayload = {
  projectId: string;
};

const target = new EventTarget();
const EVENT_NAME = "members:changed";

export function emitMembersChanged(projectId: string): void {
  target.dispatchEvent(
    new CustomEvent<MembersChangedPayload>(EVENT_NAME, {
      detail: { projectId },
    })
  );
}

export function onMembersChanged(
  handler: (projectId: string) => void
): () => void {
  const listener = (e: Event) => {
    const ce = e as CustomEvent<MembersChangedPayload>;
    if (ce?.detail?.projectId) {
      handler(ce.detail.projectId);
    }
  };
  target.addEventListener(EVENT_NAME, listener);
  return () => target.removeEventListener(EVENT_NAME, listener);
}
