'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { PROJECTS_STORAGE_KEY } from '../stuckHelp/projectMutations';
import type { ProjectBoard } from '../types';

type SetProjects = (
  value: ProjectBoard[] | ((prev: ProjectBoard[]) => ProjectBoard[])
) => void;

interface ProjectsContextValue {
  projects: ProjectBoard[];
  setProjects: SetProjects;
}

const ProjectsContext = createContext<ProjectsContextValue | null>(null);

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useLocalStorage<ProjectBoard[]>(PROJECTS_STORAGE_KEY, []);

  const value = useMemo(
    () => ({
      projects,
      setProjects,
    }),
    [projects, setProjects]
  );

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}

export function useProjects(): ProjectsContextValue {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error('useProjects must be used within ProjectsProvider');
  return ctx;
}
