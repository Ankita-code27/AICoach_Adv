import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mic, Sparkles, X, FileText, Check } from 'lucide-react';
import Alert from '../components/Alert.jsx';
import ResumeUpload from '../components/ResumeUpload.jsx';
import { generateInterview } from '../api/interview.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useInterview } from '../context/InterviewContext.jsx';
import PageBackground from '../layouts/PageBackground.jsx';

const roles = [
  'Software Engineer',
  'Frontend Developer',
  'Backend Developer',
  'Data Analyst',
  'Product Manager',
  'UX/UI Designer',
];

const interviewTypes = [
  { value: 'mixed', label: 'Mixed', description: 'Technical, behavioral & situational' },
  { value: 'technical', label: 'Technical', description: 'Hands-on knowledge & problem-solving' },
  { value: 'behavioral', label: 'Behavioral', description: 'Soft skills & past experience' },
  { value: 'coding', label: 'Coding', description: 'Live coding problems, reviewed by AI' },
];

const codingLanguages = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'csharp', label: 'C#' },
  { value: 'cpp', label: 'C++' },
  { value: 'go', label: 'Go' },
];

const difficulties = [
  { value: 'easy', label: 'Easy', description: 'Entry-level fundamentals' },
  { value: 'medium', label: 'Medium', description: 'Practical role knowledge' },
  { value: 'hard', label: 'Hard', description: 'Advanced scenarios' },
];

const questionCounts = [5, 10, 15];
const MAX_SKILLS = 8;
const MAX_JOB_DESCRIPTION = 4000;

const interviewModes = [
  { value: 'adaptive', label: 'Adaptive', description: 'The AI adjusts follow-ups to how you answer' },
  { value: 'fixed', label: 'Fixed', description: 'A set list of questions decided up front' },
];

const interviewMethods = [
  {
    value: 'written',
    label: 'Written Interview',
    badge: 'Text-based',
    icon: FileText,
    description: 'Type your responses in structured prose. Ideal for technical depth, coding challenges & quiet practice.',
  },
  {
    value: 'voice',
    label: 'Voice Interview',
    badge: 'Conversational',
    icon: Mic,
    description: 'Speak your answers naturally. Questions are spoken aloud with real-time speech-to-text transcription.',
  },
];

function InterviewSetupPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { startSession } = useInterview();
  const [role, setRole] = useState(roles[0]);
  const [method, setMethod] = useState('written');
  const [mode, setMode] = useState('adaptive');
  const [interviewType, setInterviewType] = useState('mixed');
  const [difficulty, setDifficulty] = useState('medium');
  const [questionCount, setQuestionCount] = useState(10);
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [language, setLanguage] = useState(codingLanguages[0].value);
  const [resumeContext, setResumeContext] = useState(null);
  const [resumeFileName, setResumeFileName] = useState('');
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);

  // Voice relies on the browser's Web Speech API (SpeechRecognition), which isn't available
  // everywhere (solid in Chrome/Edge, partial in Safari, absent in Firefox). Rather than offer
  // a toggle that silently does nothing, we only show it where it can actually work.
  const voiceSupported = useMemo(
    () => typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
    [],
  );

  function addSkill(rawValue) {
    const value = rawValue.trim();
    if (!value || skills.length >= MAX_SKILLS || skills.some((skill) => skill.toLowerCase() === value.toLowerCase())) {
      setSkillInput('');
      return;
    }
    setSkills((current) => [...current, value.slice(0, 40)]);
    setSkillInput('');
  }

  function handleSkillKeyDown(event) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addSkill(skillInput);
    } else if (event.key === 'Backspace' && !skillInput && skills.length) {
      setSkills((current) => current.slice(0, -1));
    }
  }

  function removeSkill(skillToRemove) {
    setSkills((current) => current.filter((skill) => skill !== skillToRemove));
  }

  function handleResumeParsed(parsed, fileName) {
    setResumeContext(parsed);
    setResumeFileName(fileName);
  }

  function handleResumeClear() {
    setResumeContext(null);
    setResumeFileName('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!role || !difficulty || !questionCount || !user) {
      setError('Choose a role, difficulty, and number of questions before starting.');
      return;
    }

    const isCoding = interviewType === 'coding';
    if (isCoding && !language) {
      setError('Choose a programming language for a coding interview.');
      return;
    }

    setGenerating(true);
    try {
      const idToken = await user.getIdToken();
      const interview = await generateInterview({
        role, difficulty, questionCount, interviewType, skills, jobDescription, mode, resumeContext,
        language: isCoding ? language : null,
      }, idToken);
      startSession({
        ...interview,
        skills,
        jobDescription,
        resumeContext,
        interviewMethod: isCoding ? 'written' : method,
        voiceMode: !isCoding && method === 'voice' && voiceSupported,
        language: isCoding ? language : null,
      });
      navigate('/interview/session');
    } catch (requestError) {
      setError(requestError.message || "We couldn't generate the interview. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <main className="setup-page">
      <PageBackground />
      <section className="card setup-card" aria-labelledby="setup-heading">
        <Link className="back-link" to="/dashboard"><ArrowLeft size={15} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '0.35rem' }} />Back to dashboard</Link>
        <p className="eyebrow"><Sparkles size={13} /> New practice session</p>
        <h1 id="setup-heading">Set up your interview</h1>
        <p className="setup-intro">Choose the role, focus, challenge level, and session length that fit your goal.</p>

        <form className="setup-form" onSubmit={handleSubmit}>
          <fieldset>
            <legend>Job role</legend>
            <label className="select-label" htmlFor="job-role">Select a role</label>
            <select id="job-role" className="select" value={role} onChange={(event) => setRole(event.target.value)}>
              {roles.map((roleOption) => <option key={roleOption}>{roleOption}</option>)}
            </select>
          </fieldset>

          <fieldset>
            <legend>Interview method</legend>
            <div className="choice-grid method-grid">
              {interviewMethods.map((option) => {
                const Icon = option.icon;
                const isVoice = option.value === 'voice';
                const isOptionDisabled = (isVoice && !voiceSupported) || (isVoice && interviewType === 'coding');
                const isSelected = (interviewType === 'coding' ? 'written' : method) === option.value;

                return (
                  <label
                    className={`choice-card method-card ${isSelected ? 'selected' : ''} ${isOptionDisabled ? 'disabled' : ''}`}
                    key={option.value}
                  >
                    <input
                      type="radio"
                      name="interviewMethod"
                      value={option.value}
                      checked={isSelected}
                      disabled={isOptionDisabled}
                      onChange={() => setMethod(option.value)}
                    />
                    <div className="method-card-header">
                      <span className="method-icon-badge">
                        <Icon size={20} />
                      </span>
                      <span className="badge badge-neutral method-tag">{option.badge}</span>
                      {isSelected && (
                        <span className="method-active-pill">
                          <Check size={12} strokeWidth={3} /> Selected
                        </span>
                      )}
                    </div>
                    <span className="choice-label">{option.label}</span>
                    <span className="choice-description">{option.description}</span>
                    {isVoice && !voiceSupported && (
                      <span className="method-hint-warn">
                        Speech recognition is not supported in this browser (try Chrome, Edge, or Safari).
                      </span>
                    )}
                    {isVoice && voiceSupported && interviewType === 'coding' && (
                      <span className="method-hint-info">
                        Coding interviews are conducted in written mode so you can write code.
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend>Interview style</legend>
            <div className="choice-grid difficulty-grid">
              {interviewModes.map((option) => (
                <label className={`choice-card ${mode === option.value ? 'selected' : ''}`} key={option.value}>
                  <input type="radio" name="mode" value={option.value} checked={mode === option.value} onChange={(event) => setMode(event.target.value)} />
                  <span className="choice-label">{option.label}</span>
                  <span className="choice-description">{option.description}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>Interview type</legend>
            <div className="choice-grid difficulty-grid">
              {interviewTypes.map((option) => (
                <label className={`choice-card ${interviewType === option.value ? 'selected' : ''}`} key={option.value}>
                  <input type="radio" name="interviewType" value={option.value} checked={interviewType === option.value} onChange={(event) => setInterviewType(event.target.value)} />
                  <span className="choice-label">{option.label}</span>
                  <span className="choice-description">{option.description}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {interviewType === 'coding' && (
            <fieldset>
              <legend>Programming language</legend>
              <label className="select-label" htmlFor="coding-language">Select a language</label>
              <select id="coding-language" className="select" value={language} onChange={(event) => setLanguage(event.target.value)}>
                {codingLanguages.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <p className="text-subtle" style={{ fontSize: 'var(--text-xs)' }}>
                Your code is reviewed by AI, not executed — treat feedback as a thorough manual code review, not a test-suite result.
              </p>
            </fieldset>
          )}

          <fieldset>
            <legend>Difficulty</legend>
            <div className="choice-grid difficulty-grid">
              {difficulties.map((option) => (
                <label className={`choice-card ${difficulty === option.value ? 'selected' : ''}`} key={option.value}>
                  <input type="radio" name="difficulty" value={option.value} checked={difficulty === option.value} onChange={(event) => setDifficulty(event.target.value)} />
                  <span className="choice-label">{option.label}</span>
                  <span className="choice-description">{option.description}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>{mode === 'adaptive' ? 'Target number of questions' : 'Number of questions'}</legend>
            <div className="choice-grid count-grid">
              {questionCounts.map((count) => (
                <label className={`choice-card count-card ${questionCount === count ? 'selected' : ''}`} key={count}>
                  <input type="radio" name="questionCount" value={count} checked={questionCount === count} onChange={() => setQuestionCount(count)} />
                  <span className="choice-label">{count}</span>
                  <span className="choice-description">questions</span>
                </label>
              ))}
            </div>
            {mode === 'adaptive' && (
              <p className="text-subtle" style={{ fontSize: 'var(--text-xs)' }}>
                In adaptive mode this is a target, not a fixed count — the interview may end a little earlier or later depending on your answers.
              </p>
            )}
          </fieldset>

          <fieldset>
            <legend>Skills or technologies <span className="text-subtle" style={{ fontWeight: 500 }}>(optional, up to {MAX_SKILLS})</span></legend>
            <div className="skill-input-row">
              {skills.map((skill) => (
                <span className="tag-chip selected" key={skill}>
                  {skill}
                  <button type="button" onClick={() => removeSkill(skill)} aria-label={`Remove ${skill}`} className="tag-remove">
                    <X size={13} />
                  </button>
                </span>
              ))}
              {skills.length < MAX_SKILLS && (
                <input
                  type="text"
                  className="input skill-input"
                  placeholder={skills.length ? 'Add another...' : 'e.g. React, PostgreSQL, AWS'}
                  value={skillInput}
                  onChange={(event) => setSkillInput(event.target.value)}
                  onKeyDown={handleSkillKeyDown}
                  onBlur={() => addSkill(skillInput)}
                />
              )}
            </div>
            <p className="text-subtle" style={{ fontSize: 'var(--text-xs)' }}>Press Enter or comma to add a skill.</p>
          </fieldset>

          <fieldset>
            <legend>Resume <span className="text-subtle" style={{ fontWeight: 500 }}>(optional)</span></legend>
            <ResumeUpload
              resumeContext={resumeContext}
              fileName={resumeFileName}
              onParsed={handleResumeParsed}
              onClear={handleResumeClear}
            />
            <p className="text-subtle" style={{ fontSize: 'var(--text-xs)' }}>
              Upload a PDF resume and some questions will be tailored to your actual background.
            </p>
          </fieldset>

          <fieldset>
            <legend>Job description <span className="text-subtle" style={{ fontWeight: 500 }}>(optional)</span></legend>
            <textarea
              className="textarea"
              rows="5"
              placeholder="Paste a job description to tailor questions even more closely to this specific role..."
              value={jobDescription}
              maxLength={MAX_JOB_DESCRIPTION}
              onChange={(event) => setJobDescription(event.target.value)}
            />
            <p className="text-subtle" style={{ fontSize: 'var(--text-xs)', textAlign: 'right' }}>{jobDescription.length}/{MAX_JOB_DESCRIPTION}</p>
          </fieldset>

          <Alert variant="error">{error}</Alert>
          <button type="submit" className="btn btn-primary" disabled={generating}>
            {generating ? <span className="btn-spinner" aria-hidden="true" /> : <Sparkles size={17} />}
            {generating ? 'Generating your interview questions...' : 'Start interview'}
          </button>
        </form>

        <aside className="setup-summary" aria-label="Selected interview settings">
          <span>Selected setup</span>
          <strong>{role} · {interviewType === 'coding' ? 'Written' : (method === 'voice' ? 'Voice' : 'Written')} · {mode} · {interviewType}{interviewType === 'coding' ? ` (${codingLanguages.find((option) => option.value === language)?.label})` : ''} · {difficulty} · {mode === 'adaptive' ? '~' : ''}{questionCount} questions{resumeContext ? ' · resume attached' : ''}</strong>
        </aside>
        <p className="setup-note">Questions are generated securely by the server and may take a moment.</p>
      </section>
    </main>
  );
}

export default InterviewSetupPage;
