export default function SimpleVariant({ value, onChange }) {
    return (
      <div className="row">
        <div className="col-3">
          <Form.Group>
            <Form.Label>Size</Form.Label>
            <Form.Control 
              type="text"
              value={value.size}
              onChange={(e)=>onChange("simpleVariant.size", e.target.value)}
            />
          </Form.Group>
        </div>
  
        <div className="col-3">
          <Form.Group>
            <Form.Label>Price</Form.Label>
            <Form.Control 
              type="number"
              value={value.price}
              onChange={(e)=>onChange("simpleVariant.price", e.target.value)}
            />
          </Form.Group>
        </div>
  
        <div className="col-3">
          <Form.Group>
            <Form.Label>Stock</Form.Label>
            <Form.Control 
              type="number"
              value={value.stock}
              onChange={(e)=>onChange("simpleVariant.stock", e.target.value)}
            />
          </Form.Group>
        </div>
  
        <div className="col-3">
          <Form.Group>
            <Form.Label>Color</Form.Label>
            <Form.Control 
              type="text"
              value={value.color}
              onChange={(e)=>onChange("simpleVariant.color", e.target.value)}
            />
          </Form.Group>
        </div>
      </div>
    );
  }
  