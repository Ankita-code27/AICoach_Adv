import { useState } from 'react';
import { FileText, Upload, CheckCircle2, X } from 'lucide-react';
import { uploadResume } from '../api/resume.js';
import { useAuth } from '../context/AuthContext.jsx';
import Alert from './Alert.jsx';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

function ResumeUpload({ resumeContext, fileName, onParsed, onClear }) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  async function processFile(file) {
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file.');
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError('Resume file must be 5MB or smaller.');
      return;
    }

    setError('');
    setUploading(true);
    try {
      const idToken = await user.getIdToken();
      const parsed = await uploadResume(file, idToken);
      onParsed(parsed, file.name);
    } catch (requestError) {
      setError(requestError.message || "We couldn't analyze this resume. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    processFile(file);
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragOver(false);
    if (uploading) return;
    processFile(event.dataTransfer.files?.[0]);
  }

  if (resumeContext) {
    const topSkills = resumeContext.skills?.slice(0, 8) || [];

    return (
      <div className="card upload-success">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
          <p className="list-row-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', margin: 0 }}>
            <span className="upload-success-icon" aria-hidden="true"><CheckCircle2 size={18} /></span>
            Resume analyzed{fileName ? `: ${fileName}` : ''}
          </p>
          <button type="button" className="btn btn-ghost btn-sm btn-auto" onClick={onClear} aria-label="Remove resume">
            <X size={15} />
          </button>
        </div>
        {resumeContext.summary && (
          <p className="text-subtle" style={{ marginTop: 'var(--space-2)' }}>{resumeContext.summary}</p>
        )}
        {topSkills.length > 0 && (
          <div className="skill-input-row" style={{ marginTop: 'var(--space-3)' }}>
            {topSkills.map((skill) => <span className="tag-chip selected" key={skill}>{skill}</span>)}
          </div>
        )}
        <p className="text-subtle" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-3)' }}>
          Some questions will be tailored to this background.
        </p>
      </div>
    );
  }

  return (
    <div>
      <label
        className={`upload-dropzone ${dragOver ? 'drag-over' : ''} ${uploading ? 'is-uploading' : ''}`}
        onDragOver={(event) => { event.preventDefault(); if (!uploading) setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <span className="upload-dropzone-icon" aria-hidden="true">
          {uploading ? <span className="btn-spinner" /> : <Upload size={22} />}
        </span>
        <span className="upload-dropzone-title">
          {uploading ? 'Analyzing your resume…' : 'Upload resume (PDF)'}
        </span>
        <span className="upload-dropzone-hint">
          {uploading ? 'This usually takes a few seconds' : 'Drag and drop, or click to browse · 5MB max'}
        </span>
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          disabled={uploading}
          style={{ display: 'none' }}
        />
      </label>
      {error && (
        <div style={{ marginTop: 'var(--space-3)' }}>
          <Alert variant="error">{error}</Alert>
        </div>
      )}
    </div>
  );
}

export default ResumeUpload;
