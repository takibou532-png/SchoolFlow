import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

export default function ArchiveConfirmDialog({ open, onClose, onConfirm, moduleName, loading }) {
  return (
    <Dialog open={open} onClose={onClose} dir="rtl">
      <DialogTitle>أرشفة المادة</DialogTitle>
      <DialogContent>
        <DialogContentText>
          هل أنت تأكد من أنك تريد أرشفة المادة <strong>{moduleName}</strong>؟
          سيؤدي هذا إلى إلغاء جميع الجلسات القادمة وإلغاء تفعيل المادة.
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          إلغاء
        </Button>
        <Button 
          onClick={onConfirm} 
          color="warning" 
          variant="contained" 
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {loading ? 'جاري الأرشفة...' : 'أرشفة'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}