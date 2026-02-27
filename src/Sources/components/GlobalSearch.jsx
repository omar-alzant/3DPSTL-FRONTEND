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
    <Container className="my-3 " fluid="sm" >
          <Form onSubmit={handleSubmit}>
            <InputGroup>


              <Form.Control
                placeholder="Search products, models, or descriptions..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="border-start-0"
              />

              <Button type="submit" variant="outline-secondary">
                <IoSearch className="fs-5"/>
              </Button>

              <Button variant="outline-danger" onClick={resetSearch}>
                <CiCircleRemove className="fs-10"/>
              </Button>
            </InputGroup>
          </Form>
     </Container>

  );
}
