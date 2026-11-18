import { useId } from 'react';

function IconField({ icon: Icon, label, type = 'text', value, onChange, required, autoComplete, minLength, endAdornment }) {
  const id = useId();

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input-with-icon">
        <span className="field-icon" aria-hidden="true"><Icon size={17} /></span>
        <input
          id={id}
          className="input"
          type={type}
          value={value}
          onChange={onChange}
          required={required}
          autoComplete={autoComplete}
          minLength={minLength}
        />
        {endAdornment}
      </div>
    </div>
  );
}

export default IconField;
