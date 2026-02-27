import { useEffect, useState } from "react";
import Image from "react-bootstrap/Image";
import ConfirmationModal from "./ConfirmationModal";
import { useNavigate } from "react-router-dom";
import { Button, Card, Col, Form, Row } from "react-bootstrap";
import { useToast } from "../context/ToastProvider";
// import ConfirmationModal from "../components/ConfirmationModal";

const CommentsSection = (({ itemId, user, rating_count, rating_avg}, ref) => {
  const [comments, setComments] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [hasUserCommented, setHasUserCommented] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { showToast } = useToast();

  const backend = process.env.REACT_APP_API_URL;


  useEffect(() => {
    setNewComment("");
    setEditingId(null);
    setEditText("");
    
    if (itemId) fetchComments();
  }, [user?.id, itemId]);

  useEffect(() => {
    if (!user?.id || comments.length === 0) {
      setHasUserCommented(false);
      return;
    }
  
    const userHasComment = comments.some(
      c => String(c.user_id) === String(user.id) && c.comment?.trim()
    );
  
    setHasUserCommented(userHasComment);
  }, [comments, user?.id]); // Dependency on user.id is more specific than the whole user object

  useEffect(() => {
    const handleGlobalAuth = () => {
      fetchComments(); // Refresh comments and permissions
    };
  
    // Listen for a custom event you trigger when login is successful
    window.addEventListener("authUpdate", handleGlobalAuth);
    return () => window.removeEventListener("authUpdate", handleGlobalAuth);
  }, []);

  /* ===========================
     FETCH COMMENTS ONLY
     =========================== */
  const fetchComments = async () => {
    const reviews = await fetch(`${backend}/api/ratings/${itemId}/reviews`)
    if(!reviews.ok){
      showToast(`Error When getting reviews`, "danger");
    }
    const data = await reviews.json();
    setComments(Array.isArray(data) ? data : []);    
  };

  /* ===========================
     DELETE COMMENT
     =========================== */
  const deleteComment = async () => {
    if (!commentToDelete) return;
    const comment_id = commentToDelete.comment_id
    
    try{

      await fetch(
        `${backend}/api/ratings/${itemId}/comment/${comment_id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${user.token}`
          }
        }
      );
    }
    catch(err){
      showToast(err, "danger");

    }
    finally{ 
      setComments(comments.filter((b) => b.comment_id !== comment_id));
      setShowModal(false);
      setCommentToDelete(null);
    }
  };

  /* ===========================
     SAVE EDIT
     =========================== */
  const saveEditComment = async () => {
    if (!editText.trim()) return;
    await fetch(
      `${backend}/api/ratings/${itemId}/comment/${editingId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({ comment: editText })
      }
    ).catch(err => showToast(err, "danger"))
    .finally(showToast("Comment editing done"));

    setEditingId(null);
    setEditText("");
    fetchComments();
  };
  const submitCommentOnly = async () => {
    if (!newComment.trim()) return;
  
    if (!user?.token) {
      setShowLoginModal(true);
      return;
    }
  
    await fetch(
      `${backend}/api/ratings/${itemId}/comments`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({ comment: newComment })
      }
    ).catch(err => showToast(err, "danger"))
    .finally(showToast("Comment added successfully"));

  
    setNewComment("");
    fetchComments();
  };
  

  const navigate = useNavigate();

  const handleGoToLogin = () => navigate("/login");

  const handleClose = () => {
    setShowLoginModal(false);
  };

  return (
    <>
         {/* COMMENTS */}
         <Row className="mt-5" key={itemId}>
      <Col md={8}>
        <div className="d-flex align-content-center justify-content-between">
          <h3>Comments</h3>
          <div className="d-flex flex-row mb-2 gap-2">
                <span className="text-muted"> ({(rating_count || 0).toFixed(1)} reviews)</span>

              <div>
                {[1, 2, 3, 4, 5].map(star => (
                  <span
                  key={star}
                  style={{
                    fontSize: "1.3rem",
                    color: star <= Math.round((rating_avg || 0).toFixed(1)  ) ? "#ffd700" : "#ddd"
                    }}
                    >
                    ★
                  </span>
                ))}
              </div>
            </div>
          </div>
          <Card className="p-3 mb-3">
            <Form.Control
              as="textarea"
              rows={3}
              placeholder={
                hasUserCommented
                  ? "You have already submitted a comment. You can edit or delete it."
                  : "Write a comment…"
              }
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={hasUserCommented}
            />

            <Button
              className="mt-3"
              onClick={submitCommentOnly}
              disabled={hasUserCommented || !newComment.trim()}
            >
              Submit
            </Button>
          </Card>

          </Col>
    </Row>
      <div>
        <h4 className="mt-4 mb-3">Reviews & Comments</h4>

        {comments.map(c =>
          c.comment?.trim() ? (
            <div
              key={c.comment_id}
              className="p-3 mb-3"
              style={{
                borderRadius: "12px",
                background: "#f8f9fa",
                border: "1px solid #eee"
              }}
            >
              <div className="d-flex justify-content-between">
                <div className="d-flex gap-2">
                  <Image
                    width="40"
                    height="40"
                    src={c.avatar || "/thumbnail.png"}
                    roundedCircle
                  />
                  <div>
                    <strong>{c.username}</strong>
                    {c.created_at !== c.updated_at && (
                      <small className="ms-2 badge bg-warning">Updated</small>
                    )}
                    <div className="text-muted small">
                      {new Date(c.updated_at).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Optional rating display (read-only) */}
                {typeof c.rate === "number" && (
                  <div>
                    {[1, 2, 3, 4, 5].map(star => (
                      <span
                        key={star}
                        style={{
                          fontSize: "1.4rem",
                          color: star <= c.rate ? "#ffd700" : "#ccc"
                        }}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {editingId === c.comment_id ? (
                <textarea
                  className="form-control mt-2"
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                />
              ) : (
                <p className="mt-2">{c.comment}</p>
              )}

              {(c.user_id === user.id || user.isadmin) && (
                <div className="mt-3 d-flex gap-2">
                  {c.user_id === user.id && editingId !== c.comment_id && (
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => {
                        setEditingId(c.comment_id);
                        setEditText(c.comment);
                      }}
                    >
                      Edit
                    </button>
                  )}

                  {editingId === c.comment_id && (
                    <>
                      <button
                        className="btn btn-sm btn-success"
                        onClick={saveEditComment}
                      >
                        Save
                      </button>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </button>
                    </>
                  )}

                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => {
                      setCommentToDelete(c);
                      setShowModal(true);
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ) : null
        )}
      </div>

      <ConfirmationModal
        show={showLoginModal}
        onHide={() => setShowLoginModal(false)}
        title="Login Required"
        message="You must be logged in."
        primaryButton={{
          text: "Go to Login",
          variant: "primary",
          onClick: handleGoToLogin,
        }}
        secondaryButton={{
          text: "Cancel",
          variant: "secondary",
          onClick: handleClose,
        }}
      />

      <ConfirmationModal
        show={showModal}
        onHide={() => setShowModal(false)}
        title="Confirm Deletion"
        titleClassName="text-danger"
        message="Are you sure you want to remove this comment?"
        primaryButton={{
          text: "Yes, remove it",
          variant: "danger",
          onClick: deleteComment
        }}
        secondaryButton={{
          text: "Cancel",
          variant: "secondary",
          onClick: () => setShowModal(false)
        }}
      />
    </>
  );
});

export default CommentsSection;
