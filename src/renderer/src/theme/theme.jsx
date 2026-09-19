// src/renderer/src/theme/theme.js
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#5345b0',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
 typography: {
  fontFamily: '"Cairo", "Segoe UI", Tahoma, Arial, sans-serif',

  h1: {
    fontWeight: 700,
  },
  h2: {
    fontWeight: 700,
  },
  h3: {
    fontWeight: 700,
  },
  h4: {
    fontWeight: 700,
  },
  h5: {
    fontWeight: 600,
  },
  h6: {
    fontWeight: 600,
  },

  body1: {
    fontWeight: 400,
  },

  body2: {
    fontWeight: 400,
  },

  button: {
    fontWeight: 600,
    textTransform: 'none',
  },
},
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});