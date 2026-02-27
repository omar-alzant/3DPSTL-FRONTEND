import { Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

export default function BreadcrumbNav({ type, model }) {
  const navigate = useNavigate();

  return (
    <nav aria-label="breadcrumb">
      <ol className="breadcrumb mb-2">

        {/* HOME */}
        <li className="breadcrumb-item">
          <Button
            variant="link"
            className="p-0 text-decoration-none"
            onClick={() => navigate("/")}
          >
            Home
          </Button>
        </li>

        {/* TYPE */}
        {type && (
          <li className="breadcrumb-item">
            <Button
              variant="link"
              className="p-0 text-decoration-none"
              onClick={() => navigate(`/shop?type_id=${type.id}`)}
            >
              {type.name}
            </Button>
          </li>
        )}

        {/* MODEL */}
        {model && (
          <li className="breadcrumb-item">
            <Button
              variant="link"
              className="p-0 text-decoration-none"
              onClick={() => navigate(`/shop?model_id=${model.id}`)}
            >
              {model.name}
            </Button>
          </li>
        )}

      </ol>
    </nav>
  );
}
