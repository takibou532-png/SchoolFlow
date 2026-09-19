// SubjectsClassrooms.jsx (Arabic version)
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGrid } from '@mui/x-data-grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import DialogContentText from '@mui/material/DialogContentText';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreIcon from '@mui/icons-material/Restore';
import { electronAPI } from '../../utils/electron';

// ─── API Functions ──────────────────────────────────
// Subjects
const fetchSubjects = async () => {
  const response = await electronAPI.subject.getAll();
  if (!response.success) throw new Error(response.error);
  return response.data;
};
const createSubject = async (data) => {
  const response = await electronAPI.subject.create(data);
  if (!response.success) throw new Error(response.error);
  return response.data;
};
const updateSubject = async ({ id, data }) => {
  const response = await electronAPI.subject.update(id, data);
  if (!response.success) throw new Error(response.error);
  return response.data;
};
const deleteSubject = async (id) => {
  const response = await electronAPI.subject.delete(id);
  if (!response.success) throw new Error(response.error);
  return response.data;
};
const restoreSubject = async (id) => {
  const response = await electronAPI.subject.restore(id);
  if (!response.success) throw new Error(response.error);
  return response.data;
};

// Classrooms
const fetchClassrooms = async () => {
  const response = await electronAPI.classroom.getAll();
  if (!response.success) throw new Error(response.error);
  return response.data;
};
const createClassroom = async (data) => {
  const response = await electronAPI.classroom.create(data);
  if (!response.success) throw new Error(response.error);
  return response.data;
};
const updateClassroom = async ({ id, data }) => {
  const response = await electronAPI.classroom.update(id, data);
  if (!response.success) throw new Error(response.error);
  return response.data;
};
const deleteClassroom = async (id) => {
  const response = await electronAPI.classroom.delete(id);
  if (!response.success) throw new Error(response.error);
  return response.data;
};
const restoreClassroom = async (id) => {
  const response = await electronAPI.classroom.restore(id);
  if (!response.success) throw new Error(response.error);
  return response.data;
};

// ─── Arabic locale for DataGrid ────────────────────
const arLocaleText = {
  // Root
  noRowsLabel: 'لا توجد صفوف',
  noResultsOverlayLabel: 'لا توجد نتائج',
  // Column menu
  columnMenuLabel: 'القائمة',
  columnMenuShowColumns: 'إظهار الأعمدة',
  columnMenuManageColumns: 'إدارة الأعمدة',
  columnMenuFilter: 'تصفية',
  columnMenuHideColumn: 'إخفاء العمود',
  columnMenuUnsort: 'إلغاء الفرز',
  columnMenuSortAsc: 'فرز تصاعدي',
  columnMenuSortDesc: 'فرز تنازلي',
  // Filter panel
  filterPanelAddFilter: 'إضافة فلتر',
  filterPanelDeleteIconLabel: 'حذف',
  filterPanelLinkOperator: 'عامل الربط',
  filterPanelOperators: 'المشغلات',
  filterPanelOperatorAnd: 'و',
  filterPanelOperatorOr: 'أو',
  filterPanelColumns: 'الأعمدة',
  filterPanelInputLabel: 'القيمة',
  filterPanelInputPlaceholder: 'قيمة الفلتر',
  // Column menu text
  columnMenuFilter: 'تصفية',
  columnMenuHideColumn: 'إخفاء',
  columnMenuShowColumns: 'إظهار الأعمدة',
  columnMenuSortAsc: 'فرز تصاعدي',
  columnMenuSortDesc: 'فرز تنازلي',
  columnMenuUnsort: 'إلغاء الفرز',
  // Toolbar
  toolbarDensity: 'الكثافة',
  toolbarDensityLabel: 'الكثافة',
  toolbarDensityCompact: 'مضغوط',
  toolbarDensityStandard: 'قياسي',
  toolbarDensityComfortable: 'مريح',
  toolbarColumns: 'الأعمدة',
  toolbarColumnsLabel: 'اختر الأعمدة',
  toolbarFilters: 'الفلاتر',
  toolbarFiltersLabel: 'إظهار الفلاتر',
  toolbarFiltersTooltipHide: 'إخفاء الفلاتر',
  toolbarFiltersTooltipShow: 'إظهار الفلاتر',
  toolbarFiltersTooltipActive: (count) => `${count} فلتر نشط`,
  toolbarExport: 'تصدير',
  toolbarExportLabel: 'تصدير',
  toolbarExportCSV: 'تنزيل CSV',
  toolbarExportPrint: 'طباعة',
  // Pagination
  MuiTablePagination: {
    labelRowsPerPage: 'صفوف في الصفحة:',
    labelDisplayedRows: ({ from, to, count }) => `${from}–${to} من ${count !== -1 ? count : `أكثر من ${to}`}`,
  },
  // Selection
  checkboxSelectionHeaderName: 'تحديد',
  // Other
  expand: 'توسيع',
  collapse: 'طي',
  filterOperatorContains: 'يحتوي',
  filterOperatorEquals: 'يساوي',
  filterOperatorStartsWith: 'يبدأ بـ',
  filterOperatorEndsWith: 'ينتهي بـ',
  filterOperatorIsEmpty: 'فارغ',
  filterOperatorIsNotEmpty: 'غير فارغ',
  filterOperatorIsAnyOf: 'أي من',
};

// ─── Form Modal Component ──────────────────────────
function FormModal({ open, onClose, title, fields, initialData, onSubmit, loading }) {
  const [formData, setFormData] = useState(initialData || {});

  React.useEffect(() => {
    if (initialData) setFormData(initialData);
    else setFormData({});
  }, [initialData, open]);

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth dir="rtl">
      <DialogTitle>{title}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {fields.map((field) => (
              <TextField
                key={field.name}
                label={field.label}
                type={field.type || 'text'}
                fullWidth
                value={formData[field.name] || ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                required={field.required}
                InputLabelProps={field.type === 'number' ? { shrink: true } : undefined}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>إلغاء</Button>
          <Button type="submit" variant="contained" loading={loading}>
            حفظ
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// ─── Confirmation Dialog ──────────────────────────
function ConfirmDialog({ open, onClose, onConfirm, title, message, loading }) {
  return (
    <Dialog open={open} onClose={onClose} dir="rtl">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button onClick={onConfirm} color="error" variant="contained" loading={loading}>
          تأكيد
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Main Component ─────────────────────────────────
export default function SubjectsClassrooms() {
  const queryClient = useQueryClient();
  const [tabIndex, setTabIndex] = useState(0);

  // ─── Subjects State ──────────────────────────────
  const [subjectFormOpen, setSubjectFormOpen] = useState(false);
  const [subjectEditing, setSubjectEditing] = useState(null);
  const [subjectConfirmOpen, setSubjectConfirmOpen] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState(null);

  // ─── Classrooms State ────────────────────────────
  const [classroomFormOpen, setClassroomFormOpen] = useState(false);
  const [classroomEditing, setClassroomEditing] = useState(null);
  const [classroomConfirmOpen, setClassroomConfirmOpen] = useState(false);
  const [classroomToDelete, setClassroomToDelete] = useState(null);

  // ─── Queries ──────────────────────────────────────
  const subjectsQuery = useQuery({
    queryKey: ['subjects'],
    queryFn: fetchSubjects,
    staleTime: 1000 * 60,
  });

  const classroomsQuery = useQuery({
    queryKey: ['classrooms'],
    queryFn: fetchClassrooms,
    staleTime: 1000 * 60,
  });

  // ─── Mutations ────────────────────────────────────
  const subjectCreateMutation = useMutation({
    mutationFn: createSubject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setSubjectFormOpen(false);
    },
  });
  const subjectUpdateMutation = useMutation({
    mutationFn: updateSubject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setSubjectFormOpen(false);
      setSubjectEditing(null);
    },
  });
  const subjectDeleteMutation = useMutation({
    mutationFn: deleteSubject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setSubjectConfirmOpen(false);
      setSubjectToDelete(null);
    },
    onError: (error) => alert(error.message),
  });
  const subjectRestoreMutation = useMutation({
    mutationFn: restoreSubject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subjects'] }),
  });

  const classroomCreateMutation = useMutation({
    mutationFn: createClassroom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
      setClassroomFormOpen(false);
    },
  });
  const classroomUpdateMutation = useMutation({
    mutationFn: updateClassroom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
      setClassroomFormOpen(false);
      setClassroomEditing(null);
    },
  });
  const classroomDeleteMutation = useMutation({
    mutationFn: deleteClassroom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
      setClassroomConfirmOpen(false);
      setClassroomToDelete(null);
    },
    onError: (error) => alert(error.message),
  });
  const classroomRestoreMutation = useMutation({
    mutationFn: restoreClassroom,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classrooms'] }),
  });

  // ─── Handlers ─────────────────────────────────────
  const handleTabChange = (_, newIndex) => setTabIndex(newIndex);

  // Subjects
  const handleAddSubject = () => {
    setSubjectEditing(null);
    setSubjectFormOpen(true);
  };
  const handleEditSubject = (row) => {
    setSubjectEditing(row);
    setSubjectFormOpen(true);
  };
  const handleDeleteSubject = (row) => {
    setSubjectToDelete(row);
    setSubjectConfirmOpen(true);
  };
  const handleRestoreSubject = (row) => {
    subjectRestoreMutation.mutate(row.id);
  };
  const handleSubjectSubmit = (data) => {
    if (subjectEditing) {
      subjectUpdateMutation.mutate({ id: subjectEditing.id, data });
    } else {
      subjectCreateMutation.mutate(data);
    }
  };

  // Classrooms
  const handleAddClassroom = () => {
    setClassroomEditing(null);
    setClassroomFormOpen(true);
  };
  const handleEditClassroom = (row) => {
    setClassroomEditing(row);
    setClassroomFormOpen(true);
  };
  const handleDeleteClassroom = (row) => {
    setClassroomToDelete(row);
    setClassroomConfirmOpen(true);
  };
  const handleRestoreClassroom = (row) => {
    classroomRestoreMutation.mutate(row.id);
  };
  const handleClassroomSubmit = (data) => {
    if (classroomEditing) {
      classroomUpdateMutation.mutate({ id: classroomEditing.id, data });
    } else {
      classroomCreateMutation.mutate(data);
    }
  };

  // ─── Table Columns ───────────────────────────────
  const subjectColumns = [
    { field: 'id', headerName: 'المعرف', width: 80 },
    { field: 'name', headerName: 'الاسم', flex: 1 },
    {
      field: 'isActive',
      headerName: 'الحالة',
      width: 120,
      renderCell: (params) => (
        <Chip label={params.value ? 'نشط' : 'مؤرشف'} color={params.value ? 'success' : 'default'} size="small" />
      ),
    },
    {
      field: 'actions',
      headerName: 'إجراءات',
      width: 180,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          {params.row.isActive ? (
            <>
              <Tooltip title="تعديل">
                <IconButton size="small" onClick={() => handleEditSubject(params.row)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="أرشفة">
                <IconButton size="small" color="warning" onClick={() => handleDeleteSubject(params.row)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          ) : (
            <Tooltip title="استعادة">
              <IconButton size="small" color="success" onClick={() => handleRestoreSubject(params.row)}>
                <RestoreIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];

  const classroomColumns = [
    { field: 'id', headerName: 'المعرف', width: 80 },
    { field: 'name', headerName: 'الاسم', flex: 1 },
    { field: 'capacity', headerName: 'السعة', width: 120 },
    {
      field: 'isActive',
      headerName: 'الحالة',
      width: 120,
      renderCell: (params) => (
        <Chip label={params.value ? 'نشط' : 'مؤرشف'} color={params.value ? 'success' : 'default'} size="small" />
      ),
    },
    {
      field: 'actions',
      headerName: 'إجراءات',
      width: 180,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          {params.row.isActive ? (
            <>
              <Tooltip title="تعديل">
                <IconButton size="small" onClick={() => handleEditClassroom(params.row)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="أرشفة">
                <IconButton size="small" color="warning" onClick={() => handleDeleteClassroom(params.row)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          ) : (
            <Tooltip title="استعادة">
              <IconButton size="small" color="success" onClick={() => handleRestoreClassroom(params.row)}>
                <RestoreIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];

  // ─── Render ──────────────────────────────────────
  return (
    <Box dir="rtl">
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        المواد والفصول الدراسية
      </Typography>

      <Tabs value={tabIndex} onChange={handleTabChange} sx={{ mb: 2 }}>
        <Tab label="المواد" />
        <Tab label="الفصول الدراسية" />
      </Tabs>

      {/* ─── Subjects Tab ─────────────────────────────── */}
      {tabIndex === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">المواد</Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddSubject}>
              إضافة مادة
            </Button>
          </Box>
          <Box sx={{ height: 500 }}>
            <DataGrid
              rows={subjectsQuery.data || []}
              columns={subjectColumns}
              loading={subjectsQuery.isLoading}
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
              disableRowSelectionOnClick
              localeText={arLocaleText}
            />
          </Box>
        </Box>
      )}

      {/* ─── Classrooms Tab ───────────────────────────── */}
      {tabIndex === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">الفصول الدراسية</Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddClassroom}>
              إضافة فصل دراسي
            </Button>
          </Box>
          <Box sx={{ height: 500 }}>
            <DataGrid
              rows={classroomsQuery.data || []}
              columns={classroomColumns}
              loading={classroomsQuery.isLoading}
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
              disableRowSelectionOnClick
              localeText={arLocaleText}
            />
          </Box>
        </Box>
      )}

      {/* ─── Modals ────────────────────────────────────── */}
      {/* Subject Form */}
      <FormModal
        open={subjectFormOpen}
        onClose={() => {
          setSubjectFormOpen(false);
          setSubjectEditing(null);
        }}
        title={subjectEditing ? 'تعديل المادة' : 'إضافة مادة'}
        fields={[{ name: 'name', label: 'الاسم', required: true }]}
        initialData={subjectEditing || {}}
        onSubmit={handleSubjectSubmit}
        loading={subjectCreateMutation.isPending || subjectUpdateMutation.isPending}
      />

      {/* Classroom Form */}
      <FormModal
        open={classroomFormOpen}
        onClose={() => {
          setClassroomFormOpen(false);
          setClassroomEditing(null);
        }}
        title={classroomEditing ? 'تعديل الفصل' : 'إضافة فصل'}
        fields={[
          { name: 'name', label: 'الاسم', required: true },
          { name: 'capacity', label: 'السعة', type: 'number', required: false },
        ]}
        initialData={classroomEditing || {}}
        onSubmit={handleClassroomSubmit}
        loading={classroomCreateMutation.isPending || classroomUpdateMutation.isPending}
      />

      {/* Subject Delete Confirmation */}
      <ConfirmDialog
        open={subjectConfirmOpen}
        onClose={() => {
          setSubjectConfirmOpen(false);
          setSubjectToDelete(null);
        }}
        onConfirm={() => subjectDeleteMutation.mutate(subjectToDelete.id)}
        title="أرشفة المادة"
        message={`هل أنت متأكد من أرشفة "${subjectToDelete?.name}"؟ لن يكون متاحًا للاستخدام في الوحدات المستقبلية.`}
        loading={subjectDeleteMutation.isPending}
      />

      {/* Classroom Delete Confirmation */}
      <ConfirmDialog
        open={classroomConfirmOpen}
        onClose={() => {
          setClassroomConfirmOpen(false);
          setClassroomToDelete(null);
        }}
        onConfirm={() => classroomDeleteMutation.mutate(classroomToDelete.id)}
        title="أرشفة الفصل"
        message={`هل أنت متأكد من أرشفة "${classroomToDelete?.name}"؟ لن يكون متاحًا للاستخدام في الجلسات المستقبلية.`}
        loading={classroomDeleteMutation.isPending}
      />
    </Box>
  );
}