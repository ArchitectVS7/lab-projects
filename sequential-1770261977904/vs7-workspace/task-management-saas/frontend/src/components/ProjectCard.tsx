import { useState } from 'react';
import { Project } from '../api/projects';

interface Props {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onClick: (project: Project) => void;
}

export function ProjectCard({ project, onEdit, onDelete, onClick }: Props) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer group" onClick={() => onClick(project)}>
      <div className="h-2 rounded-t-xl" style={{ backgroundColor: project.color }} />
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-semibold text-gray-900 truncate group-hover:text-indigo-600">{project.name}</h3>
          <div className="relative ml-2">
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 opacity-0 group-hover:opacity-100"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} />
                <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border py-1 z-20">
                  <button onClick={(e) => { e.stopPropagation(); setShowMenu(false); onEdit(project); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Edit</button>
                  <button onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDelete(project); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Delete</button>
                </div>
              </>
            )}
          </div>
        </div>
        {project.description && <p className="text-sm text-gray-500 mb-4 line-clamp-2">{project.description}</p>}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center text-sm text-gray-500">
            <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            {project._count?.tasks || 0} tasks
          </div>
          <div className="flex -space-x-2">
            {project.members.slice(0, 3).map((m) => (
              <div key={m.userId} className="h-7 w-7 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600" title={m.user.name}>
                {m.user.name.charAt(0).toUpperCase()}
              </div>
            ))}
            {project.members.length > 3 && <div className="h-7 w-7 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs text-gray-500">+{project.members.length - 3}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
