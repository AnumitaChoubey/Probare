import React, { useState, useEffect } from 'react';
import {
  Settings,
  BookOpen,
  Clock,
  Shield,
  Sliders,
  Plus,
  Edit2,
  CheckCircle2,
  RotateCcw,
  Users,
  FolderOpen,
  Trash2
} from 'lucide-react';
import { useQEMS } from '../../context/QEMSContext';
import { adminApi, projectsApi } from '../../services/api';

export const Administration: React.FC = () => {
  const { addToast, sessionData } = useQEMS();
  const [activeTab, setActiveTab] = useState<'projects' | 'users' | 'taxonomy'>('projects');

  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [projectUsers, setProjectUsers] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  
  const [newProjectName, setNewProjectName] = useState('');
  const [roleUserId, setRoleUserId] = useState('');
  const [roleName, setRoleName] = useState('Frontline Employee');

  useEffect(() => {
    loadProjects();
    loadAllUsers();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadProjectUsers(selectedProjectId);
    }
  }, [selectedProjectId]);

  const loadProjects = async () => {
    try {
      const projs = await projectsApi.list();
      setProjects(projs);
      if (projs.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projs[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadAllUsers = async () => {
    try {
      const u = await adminApi.listUsers();
      setUsers(u);
    } catch (e) {
      console.error(e);
    }
  };

  const loadProjectUsers = async (pid: string) => {
    try {
      const pu = await projectsApi.getUsers(pid);
      setProjectUsers(pu);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName) return;
    try {
      await projectsApi.create(newProjectName);
      setNewProjectName('');
      loadProjects();
      addToast({ type: 'success', title: 'Project Created', description: 'New project configured.' });
    } catch (e) {
      addToast({ type: 'error', title: 'Failed to create project' });
    }
  };

  const handleDeleteProject = async (project: any) => {
    const confirm1 = window.confirm(`Do you really want to delete the project "${project.name}"?`);
    if (!confirm1) return;
    
    const expectedText = `delete project ${project.name}`;
    const confirm2 = window.prompt(`Please type EXACTLY "${expectedText}" to confirm deletion:`);
    
    if (confirm2 !== expectedText) {
      addToast({ type: 'error', title: 'Deletion cancelled', description: 'Input did not match.'});
      return;
    }
    
    try {
      await projectsApi.delete(project.id);
      if (selectedProjectId === project.id) {
        setSelectedProjectId('');
      }
      loadProjects();
      addToast({ type: 'success', title: 'Project Deleted' });
    } catch(e) {
      addToast({ type: 'error', title: 'Failed to delete project' });
    }
  };

  const handleAssignRole = async () => {
    if (!roleUserId || !selectedProjectId) return;
    try {
      await adminApi.assignRole(roleUserId, selectedProjectId, roleName);
      loadProjectUsers(selectedProjectId);
      addToast({ type: 'success', title: 'Role Assigned' });
    } catch (e) {
      addToast({ type: 'error', title: 'Failed to assign role' });
    }
  };

  return (
    <div className="p-4 sm:p-5 lg:p-6 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-qems-bg-white border border-qems-border rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-qems-text-secondary bg-qems-bg-secondary px-2 py-0.5 rounded border border-qems-border">
              System Operations
            </span>
            <span className="text-xs text-qems-text-disabled">•</span>
            <span className="text-xs font-medium text-qems-text-muted">
              Enterprise Quality Governance
            </span>
          </div>
          <h1 className="text-base font-bold text-qems-text-primary mt-1 tracking-tight">
            QEMS Administration
          </h1>
          <p className="text-xs text-qems-text-muted mt-0.5">
            Manage projects, RBAC assignments, and system taxonomy.
          </p>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="bg-qems-bg-white border border-qems-border rounded-lg overflow-hidden">
        <div className="flex border-b border-qems-border bg-qems-bg-surface/70 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('projects')}
            className={`py-2.5 px-4 border-b-2 flex items-center space-x-2 transition whitespace-nowrap ${
              activeTab === 'projects'
                ? 'border-qems-brand-dark text-qems-brand-dark bg-qems-bg-white'
                : 'border-transparent text-qems-text-muted hover:text-qems-text-primary'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>Projects & Workspaces</span>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`py-2.5 px-4 border-b-2 flex items-center space-x-2 transition whitespace-nowrap ${
              activeTab === 'users'
                ? 'border-qems-brand-dark text-qems-brand-dark bg-qems-bg-white'
                : 'border-transparent text-qems-text-muted hover:text-qems-text-primary'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Management & RBAC</span>
          </button>
        </div>

        <div className="p-4">
          {/* TAB 1: PROJECTS */}
          {activeTab === 'projects' && (
            <div className="space-y-4">
              <div className="flex gap-2 mb-4">
                <input 
                  type="text" 
                  value={newProjectName} 
                  onChange={e => setNewProjectName(e.target.value)} 
                  placeholder="New Project Name..."
                  className="px-3 py-1.5 border border-qems-border rounded text-sm w-64"
                />
                <button 
                  onClick={handleCreateProject}
                  className="px-3 py-1.5 bg-qems-brand text-white rounded text-sm font-medium"
                >
                  Create Project
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map(p => (
                  <div key={p.id} className="p-4 border border-qems-border rounded-lg shadow-sm relative group bg-qems-bg-white hover:border-qems-brand transition">
                    <button 
                      onClick={() => handleDeleteProject(p)}
                      className="absolute top-4 right-4 p-1.5 text-red-500 bg-red-50 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100 transition"
                      title="Delete Project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <h3 className="font-bold text-lg text-qems-text-primary">{p.name}</h3>
                    <p className="text-xs text-qems-text-disabled mt-1 font-mono">ID: {p.id}</p>
                    <div className="mt-3">
                      <h4 className="text-xs font-semibold text-qems-text-muted mb-1">Taxonomy Configuration</h4>
                      <div className="text-xs bg-qems-bg-surface p-2.5 rounded text-qems-text-muted font-mono overflow-auto max-h-32 border border-qems-border shadow-inner whitespace-pre-wrap">
                        {p.taxonomy_config 
                          ? `Processes: ${Object.keys(p.taxonomy_config.processes || {}).join(', ') || 'None'}\nTeams: ${(p.taxonomy_config.teams || []).join(', ') || 'None'}\nRoot Causes: ${(p.taxonomy_config.root_causes || []).join(', ') || 'None'}`
                          : "Default Quality Configuration Applied"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: USER MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 border border-qems-border rounded-lg space-y-3">
                <h3 className="font-bold text-sm">Assign User to Project Role</h3>
                <div className="flex flex-wrap gap-3">
                  <select 
                    value={selectedProjectId} 
                    onChange={e => setSelectedProjectId(e.target.value)}
                    className="border border-qems-border rounded p-1.5 text-sm"
                  >
                    <option value="" disabled>Select Project</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <select 
                    value={roleUserId} 
                    onChange={e => setRoleUserId(e.target.value)}
                    className="border border-qems-border rounded p-1.5 text-sm"
                  >
                    <option value="" disabled>Select User</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                  </select>
                  <select 
                    value={roleName} 
                    onChange={e => setRoleName(e.target.value)}
                    className="border border-qems-border rounded p-1.5 text-sm"
                  >
                    <option value="Frontline Employee">Frontline Employee</option>
                    <option value="QA Auditor">QA Auditor</option>
                    <option value="QA Manager">QA Manager</option>
                    <option value="Quality Governance">Quality Governance</option>
                    <option value="System Administrator">System Administrator</option>
                  </select>
                  <button 
                    onClick={handleAssignRole}
                    className="px-4 py-1.5 bg-qems-brand text-white rounded text-sm font-medium"
                  >
                    Assign Role
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-bold mb-2">Users in Selected Project</h3>
                <table className="min-w-full text-left text-sm border-collapse border border-qems-border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 border-b">Name</th>
                      <th className="p-2 border-b">Email</th>
                      <th className="p-2 border-b">Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectUsers.map(u => (
                      <tr key={u.id} className="border-b">
                        <td className="p-2">{u.name}</td>
                        <td className="p-2 text-gray-500">{u.email}</td>
                        <td className="p-2 font-medium text-indigo-700">{u.project_role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
