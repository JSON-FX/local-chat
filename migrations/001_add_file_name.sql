-- Add file_name column to messages table if not exists
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='file_name') THEN
        ALTER TABLE messages ADD COLUMN file_name TEXT DEFAULT NULL;
    END IF;
END \$\$;
