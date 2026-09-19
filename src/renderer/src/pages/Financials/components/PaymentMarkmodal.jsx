import React, { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

export default function PaymentMarkModal({ open, onClose, payment, onConfirm, loading }) {
  const [amount, setAmount] = useState('');
  const [paidAt, setPaidAt] = useState('');

  if (!payment) return null;

  const handleSubmit = () => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('يرجى إدخال مبلغ صحيح');
      return;
    }
    onConfirm(amountNum, paidAt || null);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth dir="rtl">
      <DialogTitle>تسديد مستحقات الأستاذ</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2, mt: 1 }}>
          <Typography variant="body2"><strong>رقم الدفعة #:</strong> {payment.id}</Typography>
          <Typography variant="body2"><strong>المبلغ الإجمالي:</strong> {payment.amount} د.ج</Typography>
          <Typography variant="body2"><strong>المادة / الموديول:</strong> {payment.moduleName || 'غير محدد'}</Typography>
        </Box>
        <TextField
          label="المبلغ المدفوع (د.ج)"
          type="number"
          fullWidth
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={`الحد الأقصى: ${payment.amount}`}
          sx={{ mb: 2 }}
        />
        <TextField
          label="تاريخ الدفع (اختياري)"
          type="date"
          fullWidth
          InputLabelProps={{ shrink: true }}
          value={paidAt}
          onChange={(e) => setPaidAt(e.target.value)}
        />
        <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
          اترك المبلغ فارغاً لدفع المبلغ بالكامل، أو أدخل مبلغاً أقل في حالة الدفع الجزئي.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>إلغاء</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="success" 
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
        >
          تأكيد التسديد
        </Button>
      </DialogActions>
    </Dialog>
  );
}