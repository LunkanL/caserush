function EmptyState({ title, description, action }) {
  return (
    <div className="empty-state">
      <h2>{title}</h2>
      <p className="muted">{description}</p>
      {action}
    </div>
  );
}

export default EmptyState;