import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import { UserProfile, GlobalSettings, AttendanceLog, LeaveRequest, OvertimeRequest, SystemNotification } from '../types';

export const useProfile = () => {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async (): Promise<UserProfile> => { const { data } = await apiClient.get('/me'); return data as UserProfile; },
    refetchInterval: 1000 * 60 * 5, retry: false
  });
};

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async (): Promise<UserProfile[]> => { const { data } = await apiClient.get('/users'); return data as UserProfile[]; },
    refetchInterval: 1000 * 60,
  });
};

export const useLogs = () => {
  return useQuery({
    queryKey: ['logs'],
    queryFn: async (): Promise<AttendanceLog[]> => { const { data } = await apiClient.get('/logs'); return data as AttendanceLog[]; },
    refetchInterval: 1000 * 30,
  });
};

export const useSettings = () => {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async (): Promise<GlobalSettings> => { const { data } = await apiClient.get('/settings'); return data as GlobalSettings; },
    refetchInterval: 1000 * 60 * 60,
  });
};

export const useNotifications = () => {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async (): Promise<SystemNotification[]> => { const { data } = await apiClient.get('/notifications'); return data as SystemNotification[]; },
    refetchInterval: 1000 * 60,
  });
};

export const useLeaveRequests = () => {
  return useQuery({
    queryKey: ['leaveRequests'],
    queryFn: async (): Promise<LeaveRequest[]> => { const { data } = await apiClient.get('/leaves'); return data as LeaveRequest[]; },
    refetchInterval: 1000 * 60 * 2,
  });
};

export const useOvertimeRequests = () => {
  return useQuery({
    queryKey: ['overtimeRequests'],
    queryFn: async (): Promise<OvertimeRequest[]> => { const { data } = await apiClient.get('/overtime'); return data as OvertimeRequest[]; },
    refetchInterval: 1000 * 60 * 2,
  });
};

// --- MUTATIONS ---

export const useAttendanceMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload, method = 'POST' }: { id?: string, payload?: any, method?: 'POST' | 'PUT' | 'DELETE' }) => {
      if (method === 'DELETE') {
        const { data } = await apiClient.delete(`/attendance/${id}`);
        return data;
      } else if (method === 'PUT') {
        const { data } = await apiClient.put(`/attendance/${id}`, payload);
        return data;
      } else {
        const { data } = await apiClient.post('/attendance', payload);
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
    },
  });
};

export const useSettingsMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await apiClient.put('/settings', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
};

export const useLeaveMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload, method = 'POST' }: { id?: string, payload?: any, method?: 'POST' | 'PUT' | 'DELETE' }) => {
      if (method === 'DELETE') {
        const { data } = await apiClient.delete(`/leaves/${id}`);
        return data;
      } else if (method === 'PUT') {
        const { data } = await apiClient.put(`/leaves/${id}`, payload);
        return data;
      } else {
        const { data } = await apiClient.post('/leaves', payload);
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
    },
  });
};

export const useOvertimeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload, method = 'POST' }: { id?: string, payload?: any, method?: 'POST' | 'PUT' | 'DELETE' }) => {
      if (method === 'DELETE') {
        const { data } = await apiClient.delete(`/overtime/${id}`);
        return data;
      } else if (method === 'PUT') {
        const { data } = await apiClient.put(`/overtime/${id}`, payload);
        return data;
      } else {
        const { data } = await apiClient.post('/overtime', payload);
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtimeRequests'] });
    },
  });
};

export const useUserMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload, method = 'POST' }: { id?: string, payload?: any, method?: 'POST' | 'PUT' | 'DELETE' }) => {
      if (method === 'DELETE') {
        const { data } = await apiClient.delete(`/users/${id}`);
        return data;
      } else if (method === 'PUT') {
        const { data } = await apiClient.post(`/users/update`, { targetUid: id, updates: payload });
        return data;
      } else {
        const { data } = await apiClient.post('/users', { newUser: payload });
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
};
