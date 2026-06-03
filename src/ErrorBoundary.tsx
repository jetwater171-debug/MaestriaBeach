import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleClearStorage = () => {
    try {
      localStorage.clear();
      alert('Banco de dados local redefinido! Recarregando a página...');
      window.location.reload();
    } catch (e) {
      console.error(e);
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          background: 'linear-gradient(135deg, #fee2e2 0%, #fef3c7 100%)',
          fontFamily: 'sans-serif',
          color: '#7f1d1d'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            padding: '2.5rem',
            maxWidth: '500px',
            width: '100%',
            border: '1px solid #fca5a5'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
              <AlertOctagon size={40} style={{ color: '#ef4444' }} />
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Ops! Algo deu errado.</h2>
            </div>
            
            <p style={{ fontSize: '0.9rem', color: '#4b5563', marginBottom: '1.5rem' }}>
              O sistema Maestria Beach detectou um erro de inicialização. Isso geralmente ocorre se houver dados corrompidos no cache do navegador.
            </p>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '1rem',
              fontSize: '0.8rem',
              fontFamily: 'monospace',
              maxHeight: '150px',
              overflowY: 'auto',
              color: '#334155',
              marginBottom: '1.5rem'
            }}>
              <strong>Mensagem do Erro:</strong><br />
              {this.state.error?.message || 'Erro desconhecido'}
              <br /><br />
              <strong>Stack Trace:</strong><br />
              {this.state.error?.stack || ''}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => window.location.reload()}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '8px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <RefreshCw size={16} /> Tentar Novamente
              </button>

              <button 
                onClick={this.handleClearStorage}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '8px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Limpar Cache/Banco
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
