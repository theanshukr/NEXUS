import { describe, it, expect, vi } from 'vitest';
import DocumentChunker from '#ai/search/DocumentChunker.js';

describe('DocumentChunker', () => {
  it('should split text into chunks based on sentence boundaries', () => {
    const text = 'This is the first sentence. This is the second sentence! Here is a third one? And a final sentence.';
    
    // Set a tiny chunk size to force splitting on every sentence
    DocumentChunker._chunkSize = 10;
    DocumentChunker._overlapSize = 0;
    DocumentChunker._minChunkSize = 1;
    
    const chunks = DocumentChunker.chunk(text, { documentTitle: 'Test Doc' });
    
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].textContent).toContain('This is the first sentence.');
    expect(chunks[0].chunkIndex).toBe(0);
  });

  it('should preserve page numbers and metadata on chunks', () => {
    const text = 'Sentence one. Sentence two.';
    const chunks = DocumentChunker.chunk(text, { pageNumber: 5 });
    
    expect(chunks[0].pageNumber).toBe(5);
  });

  it('should discard chunks smaller than the minimum token size', () => {
    const text = 'Tiny';
    DocumentChunker._minChunkSize = 50;
    
    const chunks = DocumentChunker.chunk(text, { documentTitle: 'Test Doc' });
    expect(chunks).toHaveLength(0);
  });

  it('should apply overlap carry-over sentences on adjacent chunks', () => {
    const text = 'Sentence A. Sentence B. Sentence C. Sentence D.';
    
    DocumentChunker._chunkSize = 5;
    DocumentChunker._overlapSize = 3;
    DocumentChunker._minChunkSize = 1;

    const chunks = DocumentChunker.chunk(text, { documentTitle: 'Overlap Test' });
    
    expect(chunks.length).toBeGreaterThan(1);
    // The second chunk should carry over the last sentence of the previous chunk for context continuity
    expect(chunks[1].textContent).toContain('Sentence B.');
  });
});
