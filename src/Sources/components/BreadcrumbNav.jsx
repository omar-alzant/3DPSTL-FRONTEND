import { Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useLang } from '../i18n/LanguageContext';

export default function BreadcrumbNav({ type, model }) {
  const { tx } = useLang();
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
            {tx('Home', 'الرئيسية')}
          </Button>
        </li>

        {/* TYPE */}
        {type && (
          <li className="breadcrumb-item">
            <Button
              variant="link"
              className="p-0 text-decoration-none"
              onClick={() => navigate(`/our-works?type_id=${type.id}`)}
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
              onClick={() => navigate(`/our-works?model_id=${model.id}`)}
            >
              {model.name}
            </Button>
          </li>
        )}

      </ol>
    </nav>
  );
}
