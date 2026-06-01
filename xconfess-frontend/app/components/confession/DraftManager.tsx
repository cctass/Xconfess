"use client";

import { useState, useEffect, useRef } from "react";
import { useDrafts, Draft } from "@/app/lib/hooks/useDrafts";
import { Button } from "@/app/components/ui/button";
import { Modal } from "@/app/components/ui/modal";
import { ConfirmDialog } from "@/app/components/admin/ConfirmDialog";
import { useGlobalToast } from "@/app/components/common/Toast";
import { Trash2, Clock, FileText } from "lucide-react";
import { formatDate } from "@/app/lib/utils/formatDate";
import { Gender } from "@/app/lib/utils/validation";

interface DraftManagerProps {
  currentDraft: {
    title?: string;
    body: string;
    gender?: string;
  };
  onLoadDraft: (draft: Draft) => void;
  autoSaveInterval?: number; // in milliseconds
}

export const DraftManager: React.FC<DraftManagerProps> = ({
  currentDraft,
  onLoadDraft,
  autoSaveInterval = 30000, // 30 seconds
}) => {
  const {
    drafts,
    saveDraft,
    updateDraft,
    deleteDraft,
    clearDrafts,
    loadDraft,
  } = useDrafts();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [clearDraftsOpen, setClearDraftsOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'failed'>('saved');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>("");
  const toast = useGlobalToast();

  useEffect(() => {
    if (currentDraftId && !loadDraft(currentDraftId)) {
      setCurrentDraftId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drafts]);

  const persistDraft = async () => {
    const currentContent = JSON.stringify(currentDraft);
    if (currentContent === lastSavedRef.current) {
      return true;
    }

    if (!currentDraft.body.trim().length) {
      setSaveStatus('saved');
      setSaveMessage(null);
      lastSavedRef.current = currentContent;
      return true;
    }

    const draftToSave = {
      title: currentDraft.title,
      body: currentDraft.body,
      gender: currentDraft.gender as Gender | undefined,
    };

    setSaveStatus('saving');
    setSaveMessage('Saving draft...');

    const existingDraft = currentDraftId ? loadDraft(currentDraftId) : null;
    let success = false;

    if (existingDraft && currentDraftId) {
      success = updateDraft(currentDraftId, draftToSave);
    } else {
      if (currentDraftId) {
        setCurrentDraftId(null);
      }
      const newDraftId = saveDraft(draftToSave);
      if (newDraftId) {
        setCurrentDraftId(newDraftId);
        success = true;
      }
    }

    if (success) {
      setSaveStatus('saved');
      setSaveMessage('Draft saved.');
      lastSavedRef.current = currentContent;
      return true;
    }

    setSaveStatus('failed');
    setSaveMessage('Failed to save draft.');
    return false;
  };

  useEffect(() => {
    const currentContent = JSON.stringify(currentDraft);

    if (currentContent !== lastSavedRef.current) {
      setSaveStatus('unsaved');
      setSaveMessage('Unsaved changes');
    }

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      void persistDraft();
    }, autoSaveInterval);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [
    currentDraft,
    autoSaveInterval,
    currentDraftId,
    saveDraft,
    updateDraft,
    loadDraft,
  ]);

  const handleLoadDraft = (draft: Draft) => {
    onLoadDraft(draft);
    setCurrentDraftId(draft.id);
    setIsModalOpen(false);
  };

  const handleDeleteDraft = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteDraft(id);
    if (currentDraftId === id) {
      setCurrentDraftId(null);
    }
  };

  const handleClearDrafts = () => {
    clearDrafts();
    setCurrentDraftId(null);
    setClearDraftsOpen(false);
    toast.success("All drafts cleared.");
  };

  return (
    <>
      <ConfirmDialog
        open={clearDraftsOpen}
        onOpenChange={setClearDraftsOpen}
        title="Clear all drafts?"
        description="This will permanently remove every saved draft on this device."
        confirmLabel="Clear drafts"
        variant="danger"
        onConfirm={handleClearDrafts}
      />

      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          aria-label="Manage drafts"
          className="flex items-center gap-2"
        >
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Drafts</span>
          {drafts.length > 0 && (
            <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-xs">
              {drafts.length}
            </span>
          )}
        </Button>

        <div className="text-xs text-zinc-400">
          {saveStatus === 'saved' && saveMessage && (
            <span>{saveMessage}</span>
          )}
          {saveStatus === 'unsaved' && (
            <span className="text-amber-300">Unsaved changes</span>
          )}
          {saveStatus === 'saving' && (
            <span>Saving draft…</span>
          )}
          {saveStatus === 'failed' && (
            <span className="text-rose-300">
              Failed to save draft.{' '}
              <button
                type="button"
                onClick={() => void persistDraft()}
                className="underline"
              >
                Retry
              </button>
            </span>
          )}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Saved Drafts"
      >
        <div className="space-y-4">
          {drafts.length === 0 ? (
            <p className="text-center text-zinc-400 py-8">
              No saved drafts yet. Your drafts will be auto-saved every 30
              seconds.
            </p>
          ) : (
            <>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {drafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="group flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-4 hover:bg-zinc-800 transition-colors cursor-pointer"
                    onClick={() => handleLoadDraft(draft)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleLoadDraft(draft);
                      }
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      {draft.title && (
                        <h4 className="font-medium text-white mb-1 truncate">
                          {draft.title}
                        </h4>
                      )}
                      <p className="text-sm text-zinc-400 line-clamp-2 mb-2">
                        {draft.body}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(new Date(draft.savedAt))}
                        </span>
                        <span>{draft.characterCount} characters</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDeleteDraft(draft.id, e)}
                      aria-label={`Delete draft from ${formatDate(new Date(draft.savedAt))}`}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex justify-end pt-4 border-t border-zinc-800">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setClearDraftsOpen(true)}
                >
                  Clear All Drafts
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  );
};
