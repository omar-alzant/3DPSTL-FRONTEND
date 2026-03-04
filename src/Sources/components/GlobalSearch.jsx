import React, { useState, useEffect } from "react";
import { Form, Button, InputGroup, Card, Container } from "react-bootstrap";
import { useNavigate, useSearchParams } from "react-router-dom";
import { IoSearch } from "react-icons/io5";
import { CiCircleRemove } from "react-icons/ci";

export default function GlobalSearch({ onClose }) {
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

    navigate(`/shop?${params.toString()}`);
    onClose?.();
  };

  const resetSearch = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("q");
    params.set("page", "1");

    navigate(`/shop?${params.toString()}`);
    setQuery("");
  };

  return (
    <Container className="my-4" fluid="sm">
      <Form onSubmit={handleSubmit}>
        <InputGroup
          style={{
            background: "#12163A",
            border: "1px solid #1E245C",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 0 20px rgba(108,99,255,0.05)"
          }}
        >
          <Form.Control
            placeholder="Search products, models, or descriptions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              background: "transparent",
              border: "none",
              color: "#fff",
              padding: "12px 16px"
            }}
          />
  
          <Button
            type="submit"
            style={{
              background: "transparent",
              border: "none",
              color: "#6C63FF",
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
                color: "#A5B4FC",
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
