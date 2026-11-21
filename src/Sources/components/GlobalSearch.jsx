import React, { useState, useEffect } from "react";
import { Form, Button, InputGroup, Card, Container } from "react-bootstrap";
import { useNavigate, useSearchParams } from "react-router-dom";
import { IoSearch } from "react-icons/io5";
import { CiCircleRemove } from "react-icons/ci";
import { useLang } from '../i18n/LanguageContext';

export default function GlobalSearch({ onClose }) {
  const { tx } = useLang();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [query, setQuery] = useState("");

  // Keep input synced with URL
  useEffect(() => {
    setQuery(searchParams.get("q") || "");
  }, [searchParams]);

  const handleSubmit = (e) => {
    e.preventDefault();

    const params = new URLSearchParams(searchParams);

    if (query.trim()) {
      params.set("q", query.trim());
      params.set("page", "1");
    } else {
      params.delete("q");
    }

    navigate(`/our-works?${params.toString()}`);
    onClose?.();
  };

  const resetSearch = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("q");
    params.set("page", "1");

    navigate(`/our-works?${params.toString()}`);
    setQuery("");
  };

  return (
    <Container className="my-4" fluid="sm">
      <Form onSubmit={handleSubmit}>
        <InputGroup
          style={{
            background: "var(--brand-card)",
            border: "1px solid var(--brand-border)",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 0 20px rgba(106, 77, 255,0.05)"
          }}
        >
          <Form.Control
            placeholder={tx('Search our works…', 'دوّر بشغلنا…')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--brand-text)",
              padding: "12px 16px"
            }}
          />
  
          <Button
            type="submit"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--brand-primary)",
              padding: "0 16px"
            }}
          >
            <IoSearch className="fs-5" />
          </Button>
  
          {query && (
            <Button
              onClick={resetSearch}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--brand-light)",
                padding: "0 16px"
              }}
            >
              <CiCircleRemove className="fs-5" />
            </Button>
          )}
        </InputGroup>
      </Form>
    </Container>
  );
}
