import React from "react";
import { Card, Image } from "react-bootstrap";

const CommentItem = ({ avatar, name, time, text }) => {
  return (
    <Card className="p-3 mb-2">
      <div className="d-flex align-items-center mb-2">

        {/* Avatar */}
        <Image 
          src={avatar} 
          width={45} 
          height={45} 
          roundedCircle 
          className="me-2"
        />

        {/* Name + time */}
        <div>
          <strong className="c-black">{name}</strong>
          <div className="text-muted c-black" style={{ fontSize: "0.85rem" }}>
            {time}
          </div>
        </div>
      </div>

      {/* Comment text */}
      <div>{text}</div>
    </Card>
  );
};

export default CommentItem;
