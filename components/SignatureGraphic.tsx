import React from 'react';

const SignatureGraphic: React.FC = () => {
  return (
    <svg width="100" height="50" viewBox="0 0 100 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Butterfly-like line on top */}
      <path d="M10 15 C30 5 70 5 90 15" stroke="black" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Dynamic scribble lines */}
      <path d="M5 25 C20 10 40 40 60 20 C80 0 95 35 90 25" stroke="black" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10 30 C25 15 45 45 65 25 C85 5 90 40 85 30" stroke="black" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Diagonal crossing line */}
      <path d="M15 10 L85 40" stroke="black" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
};

export default SignatureGraphic;
