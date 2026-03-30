interface PermissionNoticeProps {
  title?: string;
  message: string;
}

const PermissionNotice = ({
  title = "Permission Required",
  message,
}: PermissionNoticeProps) => {
  return (
    <div className="animate-fade-in">
      <div className="luxury-card">
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{message}</p>
      </div>
    </div>
  );
};

export default PermissionNotice;
