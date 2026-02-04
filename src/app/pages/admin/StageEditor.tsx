import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Stage } from "@/services/appTypes";
import { Edit2, Save, X, Trash2 } from "lucide-react";

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
      <div className="flex items-center justify-between p-3 border border-border/60 rounded-lg bg-accent/20">
        <div className="flex-1">
          <div className="font-medium text-primary">{stage.label}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {new Date(stage.start).toLocaleDateString("de-DE")} – {new Date(stage.end).toLocaleDateString("de-DE")}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Key: {stage.key}</div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit2 className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border-2 border-primary/50 rounded-lg bg-accent/30 space-y-3">
      <div className="space-y-2">
        <Label htmlFor={`stage-key-${index}`} className="text-xs">Etappen-Key</Label>
        <Input
          id={`stage-key-${index}`}
          value={editedStage.key}
          onChange={(e) => setEditedStage({ ...editedStage, key: e.target.value })}
          placeholder="z. B. 2026-05"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`stage-label-${index}`} className="text-xs">Label</Label>
        <Input
          id={`stage-label-${index}`}
          value={editedStage.label}
          onChange={(e) => setEditedStage({ ...editedStage, label: e.target.value })}
          placeholder="z. B. Etappe 1 (Mai)"
        />
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor={`stage-start-${index}`} className="text-xs">Start-Datum</Label>
          <Input
            id={`stage-start-${index}`}
            type="date"
            value={editedStage.start}
            onChange={(e) => setEditedStage({ ...editedStage, start: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`stage-end-${index}`} className="text-xs">End-Datum</Label>
          <Input
            id={`stage-end-${index}`}
            type="date"
            value={editedStage.end}
            onChange={(e) => setEditedStage({ ...editedStage, end: e.target.value })}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onSave(editedStage)}>
          <Save className="h-3 w-3 mr-1" />
          Speichern
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel}>
          <X className="h-3 w-3 mr-1" />
          Abbrechen
        </Button>
      </div>
    </div>
  );
};

export default StageEditor;
