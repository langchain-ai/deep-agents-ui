import { cn } from './utils';

describe('cn', () => {
  it('should merge class names correctly', () => {
    const result = cn('text-red-500', 'bg-blue-300');
    expect(result).toBe('text-red-500 bg-blue-300');
  });

  it('should handle conditional classes', () => {
    const isActive = true;
    const result = cn('text-red-500', isActive && 'bg-blue-300', !isActive && 'bg-green-300');
    expect(result).toBe('text-red-500 bg-blue-300');
  });

  it('should handle falsy values', () => {
    const result = cn('text-red-500', null, undefined, false, 'bg-blue-300');
    expect(result).toBe('text-red-500 bg-blue-300');
  });

  it('should handle object classes', () => {
    const result = cn('text-red-500', { 'bg-blue-300': true, 'border-red-500': false });
    expect(result).toBe('text-red-500 bg-blue-300');
  });

  it('should merge conflicting Tailwind classes', () => {
    const result = cn('text-red-500', 'text-blue-500');
    expect(result).toBe('text-blue-500');
  });

  it('should handle empty arguments', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('should handle array of classes', () => {
    const result = cn(['text-red-500', 'bg-blue-300']);
    expect(result).toBe('text-red-500 bg-blue-300');
  });

  it('should handle nested arrays and objects', () => {
    const result = cn(['text-red-500', { 'bg-blue-300': true }], [['font-bold'], { 'border-red-500': false }]);
    expect(result).toBe('text-red-500 bg-blue-300 font-bold');
  });
});