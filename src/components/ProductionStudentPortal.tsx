import React, { useEffect, useRef } from 'react';
import type { User, SupabaseClient } from '@supabase/supabase-js';
import { createStudentPortal } from '../student.js';

interface ProductionStudentPortalProps {
  client: SupabaseClient;
  user: User;
  onOpenCourse: () => void;
  onOpenProfile: () => void;
  onLogout: () => Promise<void>;
  exportCourse: () => unknown;
}

export const ProductionStudentPortal: React.FC<ProductionStudentPortalProps> = ({
  client,
  user,
  onOpenCourse,
  onOpenProfile,
  onLogout,
  exportCourse,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const callbacksRef = useRef({ onOpenCourse, onOpenProfile, onLogout, exportCourse });
  callbacksRef.current = { onOpenCourse, onOpenProfile, onLogout, exportCourse };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const portal = createStudentPortal(
      client,
      {
        openCourse: () => callbacksRef.current.onOpenCourse(),
        openProfile: () => callbacksRef.current.onOpenProfile(),
        logout: () => callbacksRef.current.onLogout(),
        exportCourse: () => callbacksRef.current.exportCourse(),
      },
      mount
    );

    void portal.login(user);
    return () => portal.destroy();
  }, [client, user.id]);

  return <div ref={mountRef} className="student-portal-mount" />;
};