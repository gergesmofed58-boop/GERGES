import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Paperclip,
  Pin,
  Plus,
  Search,
  ThumbsUp,
  X,
} from 'lucide-react';
import type { NewsArticle, NewsCategory, UserRole } from '../../types/portal';
import { NEWS_CATEGORY_LABELS } from '../../utils/portalLabels';
import { ImageWithFallback } from './ImageWithFallback';

interface NewsViewProps {
  role: UserRole;
  articles: NewsArticle[];
  activeArticleId: string | null;
  onSelectArticle: (id: string | null) => void;
  onToggleAcknowledge: (id: string) => void;
  onToggleLike: (id: string) => void;
  onTogglePin: (id: string) => void;
  onPublishArticle: (payload: {
    title: string;
    summary: string;
    bodyText: string;
    category: NewsCategory;
    department: string;
    pinned: boolean;
    attachmentName?: string;
  }) => void;
  showPublishModal: boolean;
  onSetShowPublishModal: (open: boolean) => void;
}

export const NewsView: React.FC<NewsViewProps> = ({
  role,
  articles,
  activeArticleId,
  onSelectArticle,
  onToggleAcknowledge,
  onToggleLike,
  onTogglePin,
  onPublishArticle,
  showPublishModal,
  onSetShowPublishModal,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<'all' | NewsCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Publish modal state
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [category, setCategory] = useState<NewsCategory>('announcements');
  const [department, setDepartment] = useState('إدارة الموارد البشرية');
  const [pinned, setPinned] = useState(false);
  const [attachmentName, setAttachmentName] = useState('');

  const sortedAndFiltered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...articles]
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return b.publishedAt.localeCompare(a.publishedAt);
      })
      .filter((art) => {
        if (categoryFilter !== 'all' && art.category !== categoryFilter) {
          return false;
        }
        if (!q) return true;
        return (
          art.title.toLowerCase().includes(q) ||
          art.summary.toLowerCase().includes(q) ||
          art.department.toLowerCase().includes(q)
        );
      });
  }, [articles, categoryFilter, searchQuery]);

  const leadArticle = sortedAndFiltered[0] ?? null;
  const gridArticles = sortedAndFiltered.slice(1);
  const activeArticle =
    articles.find((a) => a.id === activeArticleId) ?? null;

  const handlePublishSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !summary.trim()) return;
    onPublishArticle({
      title,
      summary,
      bodyText: bodyText || summary,
      category,
      department,
      pinned,
      attachmentName: attachmentName || undefined,
    });
    setTitle('');
    setSummary('');
    setBodyText('');
    setAttachmentName('');
    setPinned(false);
    onSetShowPublishModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            أخبار الشركة والتعميمات الرسمية
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            البيانات الإدارية، قرارات الموارد البشرية، إنجازات المصنع، والفعاليات الداخلية للعاملين.
          </p>
        </div>

        {role === 'hr' && (
          <button
            type="button"
            onClick={() => onSetShowPublishModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#0F5C7E] hover:bg-[#0B4A66] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>نشر خبر أو تعميم جديد</span>
          </button>
        )}
      </div>

      {/* Category Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="inline-flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 overflow-x-auto max-w-full">
          {(
            [
              { id: 'all', label: 'الكل' },
              { id: 'announcements', label: 'تعميمات إدارية' },
              { id: 'hr', label: 'الموارد البشرية' },
              { id: 'production', label: 'إنجازات الإنتاج' },
              { id: 'events', label: 'فعاليات وأنشطة' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategoryFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                categoryFilter === tab.id
                  ? 'bg-white dark:bg-slate-900 text-[#0F5C7E] dark:text-sky-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في أخبار وتعميمات الشركة..."
            className="w-full pr-9 pl-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#0F5C7E]"
          />
        </div>
      </div>

      {/* Empty State */}
      {sortedAndFiltered.length === 0 ? (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-16 px-6 text-center space-y-3">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            لا توجد أخبار مطابقة للبحث الحالي.
          </p>
          <button
            type="button"
            onClick={() => {
              setCategoryFilter('all');
              setSearchQuery('');
            }}
            className="px-4 py-2 rounded-lg bg-[#0F5C7E] text-white text-xs font-semibold hover:bg-[#0B4A66] cursor-pointer"
          >
            عرض جميع الأخبار
          </button>
        </section>
      ) : (
        <>
          {/* Featured Lead Story (Balanced 2-Column Split) */}
          {leadArticle && (
            <article className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
              {leadArticle.imageUrl && (
                <div className="lg:col-span-6 relative min-h-[240px] bg-slate-100 dark:bg-slate-800">
                  <ImageWithFallback
                    src={leadArticle.imageUrl}
                    alt={leadArticle.imageAlt || leadArticle.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div
                className={`${
                  leadArticle.imageUrl ? 'lg:col-span-6' : 'lg:col-span-12'
                } p-6 sm:p-8 flex flex-col justify-between gap-5`}
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    {leadArticle.pinned && (
                      <>
                        <span className="font-semibold text-[#0F5C7E] dark:text-sky-400">
                          تعميم مثبت
                        </span>
                        <span aria-hidden="true">·</span>
                      </>
                    )}
                    <span>{NEWS_CATEGORY_LABELS[leadArticle.category]}</span>
                    <span aria-hidden="true">·</span>
                    <span>{leadArticle.department}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{leadArticle.publishedAt}</span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-snug text-balance">
                    {leadArticle.title}
                  </h2>

                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {leadArticle.summary}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <button
                      type="button"
                      onClick={() => onToggleLike(leadArticle.id)}
                      className={`inline-flex items-center gap-1.5 font-medium cursor-pointer transition-colors ${
                        leadArticle.likedByMe
                          ? 'text-[#0F5C7E] dark:text-sky-400'
                          : 'hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span className="font-mono tabular-nums">{leadArticle.likesCount}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleAcknowledge(leadArticle.id)}
                      className={`inline-flex items-center gap-1.5 font-medium cursor-pointer transition-colors ${
                        leadArticle.acknowledgedByMe
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        {leadArticle.acknowledgedByMe ? 'تم الاطلاع' : 'تأكيد الاطلاع'}
                      </span>
                    </button>

                    {role === 'hr' && (
                      <button
                        type="button"
                        onClick={() => onTogglePin(leadArticle.id)}
                        className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                      >
                        <Pin className="w-3.5 h-3.5" />
                        <span>{leadArticle.pinned ? 'إلغاء التثبيت' : 'تثبيت'}</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectArticle(leadArticle.id)}
                    className="px-4 py-2 rounded-lg bg-[#0F5C7E] hover:bg-[#0B4A66] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    قراءة التفاصيل كاملة
                  </button>
                </div>
              </div>
            </article>
          )}

          {/* Secondary News Grid */}
          {gridArticles.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {gridArticles.map((art) => (
                <article
                  key={art.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    {art.imageUrl && (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelectArticle(art.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onSelectArticle(art.id);
                          }
                        }}
                        className="aspect-[16/10] bg-slate-100 dark:bg-slate-800 overflow-hidden cursor-pointer"
                      >
                        <ImageWithFallback
                          src={art.imageUrl}
                          alt={art.imageAlt || art.title}
                          className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-300"
                        />
                      </div>
                    )}

                    <div className="p-6 space-y-2.5">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        {art.pinned && (
                          <>
                            <span className="font-semibold text-[#0F5C7E] dark:text-sky-400">
                              مثبت
                            </span>
                            <span aria-hidden="true">·</span>
                          </>
                        )}
                        <span>{NEWS_CATEGORY_LABELS[art.category]}</span>
                        <span aria-hidden="true">·</span>
                        <span>{art.department}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{art.publishedAt}</span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                        <button
                          type="button"
                          onClick={() => onSelectArticle(art.id)}
                          className="text-right hover:text-[#0F5C7E] dark:hover:text-sky-400 transition-colors cursor-pointer"
                        >
                          {art.title}
                        </button>
                      </h3>

                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                        {art.summary}
                      </p>

                      {art.attachmentName && (
                        <div className="pt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <Paperclip className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{art.attachmentName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                      <button
                        type="button"
                        onClick={() => onToggleLike(art.id)}
                        className={`inline-flex items-center gap-1 cursor-pointer ${
                          art.likedByMe
                            ? 'text-[#0F5C7E] dark:text-sky-400 font-semibold'
                            : 'hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span className="font-mono tabular-nums">{art.likesCount}</span>
                      </button>

                      {art.acknowledgedByMe && (
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                          تم الاطلاع
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectArticle(art.id)}
                      className="font-semibold text-[#0F5C7E] dark:text-sky-400 hover:underline whitespace-nowrap cursor-pointer"
                    >
                      قراءة الخبر
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {/* Full Article Reader Modal */}
      {activeArticle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>{NEWS_CATEGORY_LABELS[activeArticle.category]}</span>
                <span aria-hidden="true">·</span>
                <span>{activeArticle.department}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{activeArticle.publishedAt}</span>
              </div>
              <button
                type="button"
                onClick={() => onSelectArticle(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-5">
              {activeArticle.imageUrl && (
                <div className="aspect-[16/9] rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <ImageWithFallback
                    src={activeArticle.imageUrl}
                    alt={activeArticle.imageAlt || activeArticle.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="space-y-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-snug text-balance">
                  {activeArticle.title}
                </h2>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  بواسطة {activeArticle.author} · وقت القراءة التقريبي {activeArticle.readMinutes} دقائق
                </div>
              </div>

              <div className="space-y-3.5 text-sm text-slate-700 dark:text-slate-200 leading-7">
                {activeArticle.content.map((para, idx) => (
                  <p key={idx}>{para}</p>
                ))}
              </div>

              {activeArticle.attachmentName && (
                <div className="flex items-center justify-between gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Paperclip className="w-4 h-4 text-[#0F5C7E] dark:text-sky-400 shrink-0" />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {activeArticle.attachmentName}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    مرفق رسمي
                  </span>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0 bg-slate-50/70 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onToggleAcknowledge(activeArticle.id)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    activeArticle.acknowledgedByMe
                      ? 'bg-emerald-700 text-white'
                      : 'bg-[#0F5C7E] hover:bg-[#0B4A66] text-white'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {activeArticle.acknowledgedByMe ? 'تم تأكيد الاطلاع' : 'تأكيد الاطلاع على التعميم'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onToggleLike(activeArticle.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span className="font-mono tabular-nums">{activeArticle.likesCount}</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => onSelectArticle(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HR Publish News Modal */}
      {showPublishModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-lg overflow-hidden shadow-xl my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                نشر خبر أو تعميم جديد للعاملين
              </h2>
              <button
                type="button"
                onClick={() => onSetShowPublishModal(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePublishSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  عنوان الخبر أو التعميم
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: مواعيد صرف الأرباح السنوية للعاملين..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    التصنيف
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as NewsCategory)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
                  >
                    <option value="announcements">تعميمات إدارية</option>
                    <option value="hr">الموارد البشرية</option>
                    <option value="production">إنجازات الإنتاج</option>
                    <option value="events">فعاليات وأنشطة</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    الإدارة المصدرة
                  </label>
                  <input
                    type="text"
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  ملخص قصير
                </label>
                <input
                  type="text"
                  required
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="سطر تعريفي يظهر في قائمة الأخبار..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  نص الخبر الكامل
                </label>
                <textarea
                  rows={4}
                  required
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  placeholder="اكتب تفاصيل التعميم أو الخبر..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    اسم ملف مرفق (اختياري)
                  </label>
                  <input
                    type="text"
                    value={attachmentName}
                    onChange={(e) => setAttachmentName(e.target.value)}
                    placeholder="مثال: تعميم_إداري_2026.pdf"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 pt-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pinned}
                    onChange={(e) => setPinned(e.target.checked)}
                    className="rounded border-slate-300 text-[#0F5C7E] focus:ring-[#0F5C7E]"
                  />
                  <span>تثبيت الخبر في أعلى النشرة</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => onSetShowPublishModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#0F5C7E] hover:bg-[#0B4A66] text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  نشر الآن
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
