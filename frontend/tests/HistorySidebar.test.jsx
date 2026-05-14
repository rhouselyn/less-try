import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import HistorySidebar from '../src/components/HistorySidebar';

jest.mock('../src/utils/api', () => ({
  api: {
    getHistory: jest.fn(),
    deleteHistory: jest.fn(),
    renameHistory: jest.fn(),
  },
}));

const { api } = require('../src/utils/api');

const mockT = {
  historyTitle: '学习记录',
  noHistory: '暂无学习记录',
  rename: '重命名',
  delete: '删除',
};

const mockRecords = [
  {
    file_id: 'text_20240101_120000_000',
    title: '英语短文',
    source_lang: 'en',
    target_lang: 'zh',
    text_preview: 'This is a test...',
    created_at: '2024-01-01T12:00:00',
  },
  {
    file_id: 'text_20240102_120000_000',
    title: '日语文章',
    source_lang: 'ja',
    target_lang: 'zh',
    text_preview: 'これはテストです...',
    created_at: '2024-01-02T12:00:00',
  },
  {
    file_id: 'text_20240103_120000_000',
    title: 'Another English',
    source_lang: 'en',
    target_lang: 'zh',
    text_preview: 'Another test...',
    created_at: '2024-01-03T12:00:00',
  },
];

describe('HistorySidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders sidebar expanded by default', async () => {
    api.getHistory.mockResolvedValue({ records: mockRecords });
    render(<HistorySidebar onNavigateToRecord={jest.fn()} t={mockT} />);
    await waitFor(() => {
      expect(screen.getByText('学习记录')).toBeInTheDocument();
    });
  });

  test('displays history records grouped by language', async () => {
    api.getHistory.mockResolvedValue({ records: mockRecords });
    render(<HistorySidebar onNavigateToRecord={jest.fn()} t={mockT} />);
    await waitFor(() => {
      expect(screen.getByText('English')).toBeInTheDocument();
      expect(screen.getByText('日本語')).toBeInTheDocument();
      expect(screen.getByText('英语短文')).toBeInTheDocument();
      expect(screen.getByText('日语文章')).toBeInTheDocument();
      expect(screen.getByText('Another English')).toBeInTheDocument();
    });
  });

  test('shows no history message when empty', async () => {
    api.getHistory.mockResolvedValue({ records: [] });
    render(<HistorySidebar onNavigateToRecord={jest.fn()} t={mockT} />);
    await waitFor(() => {
      expect(screen.getByText('暂无学习记录')).toBeInTheDocument();
    });
  });

  test('calls onNavigateToRecord when clicking a record', async () => {
    api.getHistory.mockResolvedValue({ records: mockRecords });
    const onNavigate = jest.fn();
    render(<HistorySidebar onNavigateToRecord={onNavigate} t={mockT} />);
    await waitFor(() => {
      expect(screen.getByText('英语短文')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('英语短文'));
    expect(onNavigate).toHaveBeenCalledWith('text_20240101_120000_000', 'en', 'zh');
  });

  test('shows record count per language group', async () => {
    api.getHistory.mockResolvedValue({ records: mockRecords });
    render(<HistorySidebar onNavigateToRecord={jest.fn()} t={mockT} />);
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  test('rename calls API with correct params', async () => {
    api.renameHistory.mockResolvedValue({ success: true });
    api.getHistory.mockResolvedValue({ records: [mockRecords[0]] });
    render(<HistorySidebar onNavigateToRecord={jest.fn()} t={mockT} />);
    await waitFor(() => {
      expect(screen.getByText('英语短文')).toBeInTheDocument();
    });
    await act(async () => {
      await api.renameHistory('text_20240101_120000_000', '新标题');
    });
    expect(api.renameHistory).toHaveBeenCalledWith('text_20240101_120000_000', '新标题');
  });

  test('delete calls API with correct file_id', async () => {
    api.deleteHistory.mockResolvedValue({ success: true });
    await act(async () => {
      await api.deleteHistory('text_20240101_120000_000');
    });
    expect(api.deleteHistory).toHaveBeenCalledWith('text_20240101_120000_000');
  });

  test('shows total record count in footer', async () => {
    api.getHistory.mockResolvedValue({ records: mockRecords });
    render(<HistorySidebar onNavigateToRecord={jest.fn()} t={mockT} />);
    await waitFor(() => {
      expect(screen.getByText(/3 records/)).toBeInTheDocument();
    });
  });
});
