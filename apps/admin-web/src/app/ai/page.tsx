"use client"
import { useState } from 'react'
import AdminShell from '@/components/admin/AdminShell'
import Card from '@/components/admin/Card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MessageSquare, Settings, Maximize2, Send, Lightbulb, Plus, ChevronDown, X } from 'lucide-react'

export default function AIPage() {
  const [kbOpen, setKbOpen] = useState(false)
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const courses = [
    { id: 'c1', name: 'Sistem Informasi Manajemen Ekowisata Konservasi Mangrove Sungai Pinang', topics: 4 },
    { id: 'c2', name: 'Database Management Systems', topics: 4 },
    { id: 'c3', name: 'Web Development Fundamentals', topics: 4 },
  ]
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([])
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([])
  const [courseQuery, setCourseQuery] = useState('')
  const [topicQuery, setTopicQuery] = useState('')
  const topicsByCourse: Record<string, Array<{ id: string; name: string; courseId: string; courseName: string }>> = {
    c1: [
      { id: 'c1-t1', name: 'Introduction to Mangrove Conservation', courseId: 'c1', courseName: courses[0].name },
      { id: 'c1-t2', name: 'Information System Design', courseId: 'c1', courseName: courses[0].name },
      { id: 'c1-t3', name: 'Web Application Development', courseId: 'c1', courseName: courses[0].name },
      { id: 'c1-t4', name: 'Community Engagement Strategies', courseId: 'c1', courseName: courses[0].name },
    ],
    c2: [
      { id: 'c2-t1', name: 'Relational Modeling', courseId: 'c2', courseName: courses[1].name },
      { id: 'c2-t2', name: 'SQL Optimization', courseId: 'c2', courseName: courses[1].name },
      { id: 'c2-t3', name: 'Indexing and Caching', courseId: 'c2', courseName: courses[1].name },
      { id: 'c2-t4', name: 'Replication and Sharding', courseId: 'c2', courseName: courses[1].name },
    ],
    c3: [
      { id: 'c3-t1', name: 'HTML & CSS Basics', courseId: 'c3', courseName: courses[2].name },
      { id: 'c3-t2', name: 'JavaScript Fundamentals', courseId: 'c3', courseName: courses[2].name },
      { id: 'c3-t3', name: 'Responsive Layouts', courseId: 'c3', courseName: courses[2].name },
      { id: 'c3-t4', name: 'Accessibility Essentials', courseId: 'c3', courseName: courses[2].name },
    ],
  }

  const toggleCourse = (id: string) => {
    setSelectedCourseIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }
  const selectAll = () => setSelectedCourseIds(courses.map((c) => c.id))
  const clearAll = () => setSelectedCourseIds([])
  const toggleTopic = (id: string) => {
    setSelectedTopicIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }
  const filteredCourses = courses.filter((c) =>
    c.name.toLowerCase().includes(courseQuery.toLowerCase())
  )
  const availableTopics = selectedCourseIds.flatMap((id) => topicsByCourse[id] ?? [])
  const filteredTopics = availableTopics.filter((t) =>
    t.name.toLowerCase().includes(topicQuery.toLowerCase())
  )
  return (
    <AdminShell>
      <div className="flex h-full flex-col space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_24rem] flex-1">
          <div className="flex h-full flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-zinc-700" />
                <span className="text-sm font-semibold text-zinc-900">Chat</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-600">
                <Settings className="h-4 w-4" />
                <Maximize2 className="h-4 w-4" />
              </div>
            </div>

            <Card className="p-0 flex-1" bodyClassName="h-full">
              <div className="flex h-full flex-col">
                <div className="flex-1 overflow-y-auto space-y-4 p-4">
                  <div className="flex items-end gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-700">AI</div>
                    <div className="max-w-[75%] rounded-2xl bg-zinc-100 p-3 text-sm text-zinc-900">
                      Sumber tersebut menyajikan artikel jurnal ilmiah yang berfokus pada perancangan Sistem Informasi Manajemen (SIM) Ekowisata melalui pendekatan konservasi mangrove di Nagari Sungai Pinang, Kabupaten Pesisir Selatan. Penelitian ini bertujuan untuk mengatasi berbagai kendala, seperti kurangnya akses informasi dan masalah dalam manajemen penjualan bibit serta pelaporan perkembangan mangrove, dengan menciptakan sebuah aplikasi berbasis web.
                    </div>
                  </div>
                  <div className="flex items-end gap-2 justify-end">
                    <div className="max-w-[75%] rounded-2xl bg-zinc-900 p-3 text-sm text-white">
                      Please summarize the key points for review.
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-white">U</div>
                  </div>
                </div>
                <div className="border-t border-zinc-200 p-3 space-y-3">
                  <Input
                    placeholder="Ask a question about your selected courses and topics..."
                    className="w-full"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                  />
                  <div className="flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                      onClick={() => setSuggestOpen(true)}
                    >
                      <Lightbulb className="h-4 w-4" />
                      Suggestions
                    </Button>
                    <Button variant="outline" className="gap-2">
                      <Send className="h-4 w-4" />
                      Send
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="flex h-full flex-col space-y-4">
            <Card title="Studio" headerRight={<Maximize2 className="h-4 w-4 text-zinc-600" />} className="flex-1" bodyClassName="h-full">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">Knowledge Base</h3>
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setKbOpen(true)}
                      className="flex h-10 w-full items-center justify-between rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
                    >
                      <span>Select Knowledge Base</span>
                      <ChevronDown className="h-4 w-4 text-zinc-600" />
                    </button>
                  </div>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-white p-4">
                  <h3 className="mb-3 text-sm font-semibold text-zinc-900">Generate Knowledge</h3>
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full" disabled>
                      Generate Flashcards
                    </Button>
                    <Button variant="outline" className="w-full" disabled>
                      Generate Quiz
                    </Button>
                  </div>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-white p-4">
                  <Button variant="outline" className="w-full gap-2">
                    <Plus className="h-4 w-4" />
                    Add to Note
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
        {kbOpen && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/50" onClick={() => setKbOpen(false)} />
            <div className="absolute left-1/2 top-20 w-full max-w-3xl -translate-x-1/2 rounded-xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
                <div>
                  <div className="text-base font-semibold text-zinc-900">Select Knowledge Base</div>
                  <div className="text-sm text-zinc-600">Choose courses and specific topics to provide context for your AI assistant</div>
                </div>
                <button className="rounded-md p-2 text-zinc-600 hover:bg-zinc-100" onClick={() => setKbOpen(false)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
                <div>
                  <div className="text-sm font-semibold text-zinc-900">Courses</div>
                  <div className="mt-3">
                    <Input placeholder="Search courses..." value={courseQuery} onChange={(e) => setCourseQuery(e.target.value)} />
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Button variant="outline" className="px-3 py-2" onClick={selectAll}>Select All</Button>
                    <Button variant="outline" className="px-3 py-2" onClick={clearAll}>Clear All</Button>
                  </div>
                  <div className="mt-4 space-y-3">
                    {filteredCourses.map((c) => (
                      <label key={c.id} className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-white p-3">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-zinc-300"
                          checked={selectedCourseIds.includes(c.id)}
                          onChange={() => toggleCourse(c.id)}
                        />
                        <div>
                          <div className="text-sm font-medium text-zinc-900">{c.name}</div>
                          <div className="text-xs text-zinc-600">{c.topics} topics available</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-zinc-900">Learning Topics</div>
                  <div className="mt-3">
                    <Input placeholder="Search topics..." value={topicQuery} onChange={(e) => setTopicQuery(e.target.value)} />
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      variant="outline"
                      className="px-3 py-2 border-green-200 text-green-700 bg-green-50 hover:bg-green-100"
                      onClick={() => setSelectedTopicIds(filteredTopics.map((t) => t.id))}
                    >
                      Select All
                    </Button>
                    <Button variant="outline" className="px-3 py-2" onClick={() => setSelectedTopicIds([])}>Clear All</Button>
                  </div>
                  {selectedCourseIds.length === 0 ? (
                    <div className="mt-4 flex h-48 items-center justify-center rounded-lg border border-zinc-200 bg-white">
                      <div className="text-center text-sm text-zinc-600">
                        <Lightbulb className="mx-auto mb-2 h-6 w-6 text-zinc-500" />
                        Select one or more courses to see available learning topics
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {filteredTopics.map((t) => (
                        <label key={t.id} className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-white p-3">
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 rounded border-zinc-300"
                            checked={selectedTopicIds.includes(t.id)}
                            onChange={() => toggleTopic(t.id)}
                          />
                          <div>
                            <div className="text-sm font-medium text-zinc-900">{t.name}</div>
                            <div className="text-xs text-zinc-600">from {t.courseName}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-zinc-200 px-6 py-4">
                <div className="text-sm text-zinc-600">{selectedCourseIds.length} course{selectedCourseIds.length !== 1 ? 's' : ''}, {selectedTopicIds.length} topic{selectedTopicIds.length !== 1 ? 's' : ''} selected</div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setKbOpen(false)}>Cancel</Button>
                  <Button onClick={() => setKbOpen(false)}>Apply Selection</Button>
                </div>
              </div>
            </div>
          </div>
        )}
        {suggestOpen && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/50" onClick={() => setSuggestOpen(false)} />
            <div className="absolute left-1/2 top-24 w-full max-w-2xl -translate-x-1/2 rounded-xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-zinc-700" />
                  <div className="text-base font-semibold text-zinc-900">Suggested Questions</div>
                </div>
                <button className="rounded-md p-2 text-zinc-600 hover:bg-zinc-100" onClick={() => setSuggestOpen(false)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="max-h-[24rem] overflow-y-auto px-6 py-4 space-y-3">
                {[
                  { id: 's1', title: `Create a summary of ${courses[0].name}`, tag: 'summary' },
                  { id: 's2', title: `Create a quiz about ${courses[0].name}`, tag: 'quiz' },
                  { id: 's3', title: `Generate flashcards for ${courses[0].name}`, tag: 'flashcard' },
                  { id: 's4', title: `Explain key challenges in ${courses[0].name}`, tag: 'explain' },
                  { id: 's5', title: `List best practices from ${courses[0].name}`, tag: 'list' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="flex w-full items-start justify-between rounded-lg border border-zinc-200 bg-white p-4 text-left hover:bg-zinc-50"
                    onClick={() => setChatInput(s.title)}
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-2 h-2 w-2 rounded-full bg-blue-500" />
                      <div>
                        <div className="text-sm font-medium text-zinc-900">{s.title}</div>
                        <div className="mt-2 inline-flex rounded-md bg-zinc-100 px-2 py-1 text-xs text-zinc-700">{s.tag}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-zinc-200 px-6 py-4">
                <div className="text-sm text-zinc-600">5 questions available</div>
                <Button variant="outline" onClick={() => setSuggestOpen(false)}>Close</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  )
}
