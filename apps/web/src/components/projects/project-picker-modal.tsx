import React, { useState } from "react";
import { GlassModal } from "@/components/ui/glass-modal";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { TechnicalButton } from "@/components/ui/technical-button";
import { trpc } from "@/lib/trpc";

interface ProjectPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (projectId: string) => void;
  onCreateNew?: () => void;
}

export const ProjectPickerModal: React.FC<ProjectPickerModalProps> = ({ isOpen, onClose, onSelect, onCreateNew }) => {
  const [search, setSearch] = useState("");
  const { data: projects = [], isLoading } = trpc.project.list.useQuery();

  const filteredProjects = projects.filter((p: any) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <GlassModal isOpen={isOpen} onClose={onClose} sizeClassName="max-w-md min-h-[300px]">
      <div className="w-full h-full bg-stone-900 text-stone-200 font-mono border border-stone-700 rounded-xl max-h-[90vh] overflow-y-auto p-4 min-w-[340px]">
        <h2 className="text-xl font-bold text-stone-200 mb-1 tracking-widest uppercase">Select a Project</h2>
        <p className="text-stone-400 text-xs mb-2">Choose a project to open in the visualizer, or create a new one.</p>
        <input
          type="text"
          placeholder="Search projects..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-3 py-2 mb-4 border border-stone-700 rounded-md text-stone-200 bg-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
        <div className="max-h-64 overflow-y-auto mb-4">
          {isLoading ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-stone-500 text-center py-8">No projects found.</div>
          ) : (
            <ul>
              {filteredProjects.map((project: any) => (
                <li key={project.id}>
                  <button
                    className="w-full text-left px-4 py-3 rounded hover:bg-stone-700 transition flex flex-col mb-1 border border-transparent hover:border-emerald-400"
                    onClick={() => { onSelect(project.id); }}
                  >
                    <span className="font-bold text-stone-200">{project.name}</span>
                    <span className="text-xs text-stone-400">{project.description || "No description"}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <TechnicalButton variant="primary" size="lg" className="w-full bg-emerald-400 text-stone-900 font-bold mt-2" onClick={onCreateNew}>
          + Create New Project
        </TechnicalButton>
      </div>
    </GlassModal>
  );
}; 