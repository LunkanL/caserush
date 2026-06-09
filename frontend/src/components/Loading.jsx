function Loading({ text = "Loading..." }) {
  return (
    <div className="loading-box">
      <div className="spinner"></div>
      <p>{text}</p>
    </div>
  );
}

export default Loading;