import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { InterviewProvider } from './context/InterviewContext.jsx';
import './styles/global.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <InterviewProvider>
          <App />
        </InterviewProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
