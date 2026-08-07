UPDATE movies
SET title = LOWER(title)
WHERE BINARY title <> BINARY LOWER(title);
