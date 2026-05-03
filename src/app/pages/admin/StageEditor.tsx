import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Stage } from "@/services/appTypes";
import { Edit2, Save, X, Trash2 } from "lucide-react";
import { StitchButton } from "@/app/components/StitchPrimitives";

interface StageEditorProps {
  stage: Stage;
  index: number;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (stage: Stage) => void;
  onCancel: () => void;
  onDelete: () => void;
}

const StageEditor = ({ stage, index, isEditing, onEdit, onSave, onCancel, onDelete }: StageEditorProps) => {
  const [editedStage, setEditedStage] = useState<Stage>(stage);

  useEffect(() => {
    setEditedStage(stage);
  }, [stage]);

  if (!isEditing) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-[rgba(0,38,55,0.1)] bg-white/70 p-3">
        <div className="flex-1">
          <div className="font-semibold text-[#002637]">{stage.label}</div>
          <div className="mt-1 text-xs text-[rgba(27,28,26,0.55)]">
            {new Date(stage.start).toLocaleDateString("de-DE")} – {new Date(stage.end).toLocaleDateString("de-DE")}
          </div>
          <div className="mt-1 text-xs text-[rgba(27,28,26,0.45)]">Key: {stage.key}</div>
        </div>
        <div className="flex gap-2">
          <StitchButton type="button" variant="outline" size="sm" onClick={onEdit}>
            <Edit2 className="h-3 w-3" />
          </StitchButton>
          <StitchButton
            type="button"
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="border-[#c41e3a]/35 text-[0.58rem] text-[#b42318] hover:bg-[#c41e3a]/08"
          >
            <Trash2 className="h-3 w-3" />
          </StitchButton>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border-2 border-[#003d55]/25 bg-[rgba(0,61,85,0.04)] p-4">
      <div className="space-y-2">
        <Label htmlFor={`stage-key-${index}`} className="text-xs">
          Etappen-Key
        </Label>
        <Input
          id={`stage-key-${index}`}
          value={editedStage.key}
          onChange={(e) => setEditedStage({ ...editedStage, key: e.target.value })}
          placeholder="z. B. 2026-05"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`stage-label-${index}`} className="text-xs">
          Label
        </Label>
        <Input
          id={`stage-label-${index}`}
          value={editedStage.label}
          onChange={(e) => setEditedStage({ ...editedStage, label: e.target.value })}
          placeholder="z. B. Etappe 1 (Mai)"
        />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`stage-start-${index}`} className="text-xs">
            Start-Datum
          </Label>
          <Input
            id={`stage-start-${index}`}
            type="date"
            value={editedStage.start}
            onChange={(e) => setEditedStage({ ...editedStage, start: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`stage-end-${index}`} className="text-xs">
            End-Datum
          </Label>
          <Input
            id={`stage-end-${index}`}
            type="date"
            value={editedStage.end}
            onChange={(e) => setEditedStage({ ...editedStage, end: e.target.value })}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <StitchButton type="button" size="sm" onClick={() => onSave(editedStage)}>
          <Save className="h-3 w-3" />
          Speichern
        </StitchButton>
        <StitchButton type="button" variant="outline" size="sm" onClick={onCancel}>
          <X className="h-3 w-3" />
          Abbrechen
        </StitchButton>
      </div>
    </div>
  );
};

export default StageEditor;
