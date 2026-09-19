import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGrid } from '@mui/x-data-grid';
import { arSD } from '@mui/x-data-grid/locales';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import ArchiveIcon from '@mui/icons-material/Archive';
import { electronAPI } from '../../utils/electron';
import CreateModuleModal from './components/CreateModuleModal';
import ModuleDetailsDrawer from './components/ModuleDetailsDrawer';
import ArchiveConfirmDialog from './components/ArchiveConfirmDialog';
import UpdateScheduleModal from './components/UpdateScheduleModal';

const fetchModules = async (options) => {
  const response = await electronAPI.module.getAll(options);
  if (!response.success) throw new Error(response.error);
  return response.data;
};

export default function Modules() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // الكل | نشط | مؤرشف
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState(null);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [updateScheduleOpen, setUpdateScheduleOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['modules', { search: searchTerm, status: filterStatus }],
    queryFn: () => fetchModules({
      search: searchTerm,
      where: filterStatus === 'all' ? {} : { isActive: filterStatus === 'active' }
    }),
    staleTime: 1000 * 60,
  });

  const archiveMutation = useMutation({
    mutationFn: async (moduleId) => {
      const response = await electronAPI.module.archive(moduleId);
      console.log("archive :", response);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
    },
  });

  const handleViewDetails = (module) => {
    setSelectedModule(module);
    setDetailsOpen(true);
  };

  const handleArchive = (module) => {
    setSelectedModule(module);
    setArchiveDialogOpen(true);
  };

  const handleUpdateSchedule = (module) => {
    setSelectedModule(module);
    setUpdateScheduleOpen(true);
  };

  const confirmArchive = () => {
    if (selectedModule) {
      archiveMutation.mutate(selectedModule.id);
      setArchiveDialogOpen(false);
    }
  };

  const columns = useMemo(() => [
    {
      field: 'name',
      headerName: 'اسم المادة',
      width: 170,
      renderCell: (params) => `${params.row.name} (${params.row.level || ''})`,
    },
    {
      field: 'subjectName',
      headerName: 'الموضوع',
      width: 150,
      valueGetter: (value, row) => row.subjectName || '-',
    },
    {
      field: 'teacherName',
      headerName: 'الأستاذ',
      width: 170,
      valueGetter: (value, row) =>
        row.teacherFirstName || row.teacherLastName
          ? `${row.teacherFirstName || ''} ${row.teacherLastName || ''}`.trim()
          : '-',
    },
    {
      field: 'sessionsPerMonth',
      headerName: 'الحصص / الشهر',
      width: 130,
    },
    {
      field: 'studentCount',
      headerName: 'عدد الطلاب',
      width: 110,
      valueGetter: (value, row) => row.studentCount || 0,
    },
    {
      field: 'isActive',
      headerName: 'الحالة',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'نشط' : 'مؤرشف'}
          color={params.value ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'الإجراءات',
      width: 180,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="عرض التفاصيل">
            <IconButton size="small" onClick={() => handleViewDetails(params.row)}>
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="تعديل الجدول الزمني">
            <IconButton size="small" onClick={() => handleUpdateSchedule(params.row)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {params.row.isActive && (
            <Tooltip title="أرشفة">
              <IconButton size="small" color="warning" onClick={() => handleArchive(params.row)}>
                <ArchiveIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ], []);

  return (
    <Box dir="rtl">
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">إدارة المواد</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateModalOpen(true)}
        >
          إضافة مادة جديدة
        </Button>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          size="small"
          label="بحث..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ width: 280 }}
        />
        <FormControl size="small" sx={{ width: 160 }}>
          <InputLabel>الحالة</InputLabel>
          <Select
            value={filterStatus}
            label="الحالة"
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <MenuItem value="all">الكل</MenuItem>
            <MenuItem value="active">النشطة</MenuItem>
            <MenuItem value="archived">المؤرشفة</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* DataGrid */}
      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={data || []}
          columns={columns}
          loading={isLoading}
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
          localeText={arSD.components.MuiDataGrid.defaultProps.localeText}
          disableRowSelectionOnClick
        />
      </Box>

      {/* Modals */}
      <CreateModuleModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          setCreateModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ['modules'] });
        }}
      />
      <ModuleDetailsDrawer
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        moduleId={selectedModule?.id}
      />
      <ArchiveConfirmDialog
        open={archiveDialogOpen}
        onClose={() => setArchiveDialogOpen(false)}
        onConfirm={confirmArchive}
        moduleName={selectedModule?.name}
        loading={archiveMutation.isPending}
      />
      <UpdateScheduleModal
        open={updateScheduleOpen}
        onClose={() => setUpdateScheduleOpen(false)}
        module={selectedModule}
        onSuccess={() => {
          setUpdateScheduleOpen(false);
          queryClient.invalidateQueries({ queryKey: ['modules'] });
        }}
      />
    </Box>
  );
}