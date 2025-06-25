import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';

const ContractEditor = ({ content, readOnly = true, onContentChange }) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: content || '',
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onContentChange?.(html);
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
    }
  }, [content, editor]);

  if (!editor) return <p>Loading editor...</p>;

  return (
    <div className="editor-wrapper" style={{ border: '1px solid #ccc', borderRadius: '6px', padding: '1rem' }}>
      <EditorContent editor={editor} />
    </div>
  );
};

export default ContractEditor;
