import { Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowRight, Send, Timer } from "lucide-react";
import Alert from "../components/Alert.jsx";
import EvaluationDetails from "../components/EvaluationDetails.jsx";
import QuestionReader from "../components/QuestionReader.jsx";
import VoiceInterviewConsole from "../components/VoiceInterviewConsole.jsx";
import CodeEditor from "../components/CodeEditor.jsx";
import ProblemStatement from "../components/ProblemStatement.jsx";
import { useInterview } from "../context/InterviewContext.jsx";
import { evaluateAnswer, getNextQuestion, saveCompletedInterview } from "../api/interview.js";
import { useAuth } from "../context/AuthContext.jsx";
import PageBackground from '../layouts/PageBackground.jsx';

const DURATION_BY_DIFFICULTY_SECONDS = { easy: 180, medium: 240, hard: 300 };

function formatTimer(totalSeconds) {
  const isOvertime = totalSeconds < 0;
  const absSeconds = Math.abs(totalSeconds);
  const minutes = Math.floor(absSeconds / 60);
  const seconds = absSeconds % 60;
  const formatted = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  return isOvertime ? `+${formatted}` : formatted;
}

function InterviewSessionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    session,
    saveAnswer,
    saveEvaluation,
    appendQuestion,
    moveToNextQuestion,
    completeSession,
  } = useInterview();
  const question = session?.questions?.[session.currentQuestionIndex];
  const evaluation = session?.evaluations?.[question?.id];
  const isCodingQuestion = question?.type === "coding";

  // Coding answers are { code, language } objects (see InterviewContext.jsx's saveAnswer),
  // so they're kept in their own state slot rather than sharing `answer`'s string shape.
  const [answer, setAnswer] = useState(() => {
    const initialQuestion = session?.questions?.[session.currentQuestionIndex];
    if (!initialQuestion || initialQuestion.type === "coding") return "";
    return session.answers[initialQuestion.id] || "";
  });
  const [code, setCode] = useState(() => {
    const initialQuestion = session?.questions?.[session.currentQuestionIndex];
    if (initialQuestion?.type !== "coding") return "";
    return session.answers[initialQuestion.id]?.code ?? initialQuestion.problemSpec?.starterCode ?? "";
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(
    () => DURATION_BY_DIFFICULTY_SECONDS[session?.difficulty] || 240,
  );

  useEffect(() => {
    if (!question || !session) return;
    if (question.type === "coding") {
      setCode(session.answers[question.id]?.code ?? question.problemSpec?.starterCode ?? "");
    } else {
      setAnswer(session.answers[question.id] || "");
    }
    setSubmitting(false);
    setSecondsRemaining(
      DURATION_BY_DIFFICULTY_SECONDS[session.difficulty] || 240,
    );
  }, [question?.id]);

  useEffect(() => {
    if (!question || evaluation || submitting) return undefined;
    const intervalId = setInterval(() => {
      setSecondsRemaining((current) => current - 1);
    }, 1000);
    return () => clearInterval(intervalId);
  }, [question?.id, Boolean(evaluation), submitting]);

  useEffect(() => {
    function handleBeforeUnload(event) {
      if (session && !session.completed) {
        event.preventDefault();
        event.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [session]);

  if (!session) return <Navigate to="/interview/setup" replace />;
  if (session.completed) return <Navigate to="/interview/complete" replace />;

  if (!question) return <Navigate to="/interview/setup" replace />;

  const isAdaptive = session.mode === "adaptive";
  const isVoiceInterview = session.interviewMethod === "voice" || (Boolean(session.voiceMode) && session.interviewMethod !== "written");
  const isVoiceMode = isVoiceInterview && !isCodingQuestion;
  const questionNumber = session.currentQuestionIndex + 1;
  // In fixed mode the total is known up front. In adaptive mode there is no fixed total -
  // whether this is the last question is only decided by the server after the answer is
  // evaluated, so this can only ever be true for fixed-mode interviews.
  const isFinalQuestion =
    !isAdaptive && questionNumber === session.questions.length;
  const progressDenominator = isAdaptive
    ? Math.max(session.targetQuestionCount, questionNumber)
    : session.questions.length;
  const progress = Math.min(
    100,
    (questionNumber / progressDenominator) * 100,
  );
  const isOvertime = secondsRemaining < 0;
  const isLowTime = !isOvertime && secondsRemaining <= 30;

  function handleAnswerChange(event) {
    setAnswer(event.target.value);
    if (error) setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmedAnswer = isCodingQuestion ? code.trim() : answer.trim();
    if (!trimmedAnswer) {
      setError(
        isCodingQuestion
          ? "Please write some code before submitting."
          : "Please enter your answer before submitting.",
      );
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      const idToken = await user.getIdToken();
      const submittedAnswer = isCodingQuestion
        ? { code: trimmedAnswer, language: session.language }
        : trimmedAnswer;
      const evaluationResult = await evaluateAnswer(
        {
          question: question.question,
          answer: submittedAnswer,
          role: session.role,
          difficulty: session.difficulty,
          skills: session.skills,
          jobDescription: session.jobDescription,
          resumeContext: session.resumeContext,
          questionType: question.type,
          problemSpec: isCodingQuestion ? question.problemSpec : null,
        },
        idToken,
      );
      saveAnswer(question.id, submittedAnswer);
      saveEvaluation(question.id, evaluationResult);
    } catch (requestError) {
      setError(
        requestError.message ||
          "Unable to evaluate your answer right now. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function requestLeave(destination) {
    if (
      window.confirm(
        "You have an interview in progress. Leaving now will keep your progress saved locally, but are you sure you want to leave this page?",
      )
    ) {
      navigate(destination);
    }
  }

  async function finishInterview() {
    const idToken = await user.getIdToken();
    const result = await saveCompletedInterview(session, idToken);
    completeSession(result);
    navigate("/interview/complete", { replace: true });
  }

  async function handleAdvance() {
    setAdvancing(true);
    setError("");

    try {
      if (isAdaptive) {
        // Ask the server whether to continue or wrap up, based on the full transcript so
        // far. This is the one extra network round-trip adaptive mode adds compared to
        // fixed mode's purely local "increment the index" advance.
        const idToken = await user.getIdToken();
        const history = session.questions
          .filter((historyQuestion) => session.evaluations[historyQuestion.id])
          .map((historyQuestion) => {
            const historyAnswer = session.answers[historyQuestion.id];
            const base = {
              question: historyQuestion.question,
              type: historyQuestion.type,
              score: session.evaluations[historyQuestion.id].score,
            };
            // Coding history entries carry `code`/`language` instead of a prose `answer` -
            // see validateHistoryItem's coding branch in interview.validator.js.
            return historyQuestion.type === "coding"
              ? { ...base, code: historyAnswer?.code, language: historyAnswer?.language }
              : { ...base, answer: historyAnswer };
          });

        const next = await getNextQuestion(
          {
            role: session.role,
            difficulty: session.difficulty,
            interviewType: session.interviewType,
            skills: session.skills,
            jobDescription: session.jobDescription,
            resumeContext: session.resumeContext,
            history,
            targetQuestionCount: session.targetQuestionCount,
            language: session.language,
          },
          idToken,
        );

        if (next.done) {
          await finishInterview();
          return;
        }

        appendQuestion({
          id: session.questions.length + 1,
          question: next.question,
          type: next.type,
          ...(next.type === "coding" ? { problemSpec: next.problemSpec, language: session.language } : {}),
        });
        moveToNextQuestion();
        navigate("/interview/session", { replace: true });
        return;
      }

      if (isFinalQuestion) {
        await finishInterview();
        return;
      }

      moveToNextQuestion();
      navigate("/interview/session", { replace: true });
    } catch (requestError) {
      setError(
        requestError.message ||
          "Unable to continue the interview right now. Please try again.",
      );
    } finally {
      setAdvancing(false);
    }
  }

  return (
    <main className="interview-page">
      <PageBackground />
      <section
        className="card interview-card"
        aria-labelledby="interview-heading"
      >
        <div className="interview-meta">
          <div className="page-header" style={{ alignItems: "center" }}>
            <p className="eyebrow" style={{ margin: 0 }}>
              AI Interview Coach
            </p>
            <button
              type="button"
              className="btn btn-ghost btn-auto btn-sm"
              onClick={() => requestLeave("/dashboard")}
            >
              Exit interview
            </button>
          </div>
          <div className="interview-meta-row">
            <p className="question-counter">
              Question {questionNumber}
              {isAdaptive
                ? ` (~${session.targetQuestionCount} planned)`
                : ` of ${session.questions.length}`}
            </p>
            {!evaluation && (
              <span
                className={`timer-badge ${isOvertime ? "timer-overtime" : isLowTime ? "timer-warning" : ""}`}
                role="timer"
                aria-live="polite"
              >
                <Timer size={15} /> {formatTimer(secondsRemaining)}
              </span>
            )}
          </div>
          <p className="session-settings">
            {session.role} <span aria-hidden="true">•</span>{" "}
            {isVoiceInterview ? "Voice Interview" : "Written Interview"}{" "}
            <span aria-hidden="true">•</span> {session.interviewType}{" "}
            <span aria-hidden="true">•</span> {session.difficulty}
          </p>
        </div>
        <div
          className="progress-track"
          aria-label={
            isAdaptive
              ? `Question ${questionNumber}, roughly ${session.targetQuestionCount} planned`
              : `Question ${questionNumber} of ${session.questions.length}`
          }
        >
          <div className="progress-value" style={{ width: `${progress}%` }} />
        </div>
        <article className="question-card">
          <div className="page-header" style={{ alignItems: "center", marginBottom: 0 }}>
            <p className="question-type" style={{ margin: 0 }}>{question.type}</p>
            {isVoiceMode && (
              <QuestionReader
                questionId={question.id}
                text={question.question}
                autoPlay
              />
            )}
          </div>
          <h1 id="interview-heading">{question.question}</h1>
          {isCodingQuestion && <ProblemStatement problemSpec={question.problemSpec} />}
        </article>
        {!evaluation && (
          isVoiceMode ? (
            <VoiceInterviewConsole
              value={answer}
              onChange={setAnswer}
              onSubmit={handleSubmit}
              submitting={submitting}
              disabled={submitting}
              error={error}
            />
          ) : (
            <form className="answer-form written-form" onSubmit={handleSubmit}>
              <div className="answer-header-row">
                <label htmlFor="interview-answer">
                  {isCodingQuestion ? `Your solution (${question.language || session.language})` : "Your answer"}
                </label>
                {!isCodingQuestion && (
                  <span className="text-subtle" style={{ fontSize: "var(--text-xs)" }}>
                    {answer.trim() ? answer.trim().split(/\s+/).length : 0} {answer.trim().split(/\s+/).length === 1 ? 'word' : 'words'} · {answer.length} chars
                  </span>
                )}
              </div>
              {isCodingQuestion ? (
                <CodeEditor
                  value={code}
                  onChange={setCode}
                  language={question.language || session.language}
                  disabled={submitting || Boolean(evaluation)}
                  placeholder="Write your solution here..."
                />
              ) : (
                <textarea
                  id="interview-answer"
                  className="textarea"
                  value={answer}
                  onChange={handleAnswerChange}
                  placeholder="Type your answer here..."
                  rows="8"
                  disabled={submitting || Boolean(evaluation)}
                />
              )}
              <Alert variant="error">{error}</Alert>
              <button
                type="submit"
                className="btn btn-primary btn-auto"
                disabled={submitting}
              >
                {submitting ? (
                  <span className="btn-spinner" aria-hidden="true" />
                ) : (
                  <Send size={16} />
                )}
                {submitting ? (isCodingQuestion ? "Reviewing your code..." : "Evaluating your answer...") : (isCodingQuestion ? "Submit solution" : "Submit answer")}
              </button>
            </form>
          )
        )}
        {evaluation && (
          <section className="evaluation-card">
            <EvaluationDetails evaluation={evaluation} />
            <Alert variant="error">{error}</Alert>
            <button
              type="button"
              className="btn btn-primary btn-auto"
              onClick={handleAdvance}
              disabled={advancing}
            >
              {advancing ? (
                <span className="btn-spinner" aria-hidden="true" />
              ) : (
                <ArrowRight size={16} />
              )}
              {advancing
                ? isAdaptive
                  ? "Preparing what's next..."
                  : "Saving results..."
                : isAdaptive
                  ? "Continue"
                  : isFinalQuestion
                    ? "Finish interview"
                    : "Next question"}
            </button>
          </section>
        )}
      </section>
    </main>
  );
}

export default InterviewSessionPage;
