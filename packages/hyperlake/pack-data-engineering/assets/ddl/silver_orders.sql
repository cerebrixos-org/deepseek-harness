CREATE TABLE silver.orders (
  order_id VARCHAR NOT NULL,
  customer_id VARCHAR NOT NULL,
  order_timestamp TIMESTAMP NOT NULL,
  order_total DECIMAL(18, 2),
  source_updated_at TIMESTAMP NOT NULL
);
