"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Plus, X, Shuffle, Sparkles } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent } from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

export type InterviewerStyle = "gentle" | "strict" | "mean";

interface RoleFormData {
  name: string;
  companyInfo?: string;
  companyCode?: File | null;
  companyCulture?: string;
  assignmentGithubLink?: string;
  interviewerStyle: InterviewerStyle;
  historicTranscript?: File | null;
  requiredStacks?: Record<string, number>;
}

interface AddRoleFormProps {
  onComplete: (data: RoleFormData) => void;
  onCancel: () => void;
}

const steps = [
  { id: 1, title: "Role Name" },
  { id: 2, title: "Company Info" },
  { id: 3, title: "Assignment" },
  { id: 4, title: "Tech Stacks" },
  { id: 5, title: "Interviewer Style" },
  { id: 6, title: "Preview" },
];

const ROLE_NAME_OPTIONS = [
  "Junior Frontend engineer",
  "Senior Frontend engineer",
  "Junior Backend engineer",
  "Senior Backend engineer",
  "Junior Full Stack engineer",
  "Senior Full Stack engineer",
  "Junior DevOps engineer",
  "Senior DevOps engineer",
] as const;

type RoleNameOption = (typeof ROLE_NAME_OPTIONS)[number];

// 根据角色名称生成技术栈的预设
function getStacksFromRoleName(name: string): Record<string, number> {
  const n = name.toLowerCase();
  
  if (n.includes("frontend")) {
    return {
      React: 0.35,
      TypeScript: 0.25,
      "CSS/Tailwind": 0.15,
      "Next.js": 0.15,
      "Testing": 0.1,
    };
  }
  
  if (n.includes("backend")) {
    return {
      "Node.js": 0.3,
      PostgreSQL: 0.25,
      "REST APIs": 0.2,
      TypeScript: 0.15,
      "Testing": 0.1,
    };
  }
  
  if (n.includes("full stack") || n.includes("fullstack")) {
    return {
      React: 0.25,
      "Node.js": 0.25,
      TypeScript: 0.2,
      PostgreSQL: 0.15,
      "Next.js": 0.15,
    };
  }
  
  if (n.includes("devops")) {
    return {
      Docker: 0.3,
      Kubernetes: 0.25,
      "CI/CD": 0.2,
      "Cloud (AWS/GCP)": 0.15,
      "Monitoring": 0.1,
    };
  }
  
  if (n.includes("database") || n.includes("dba")) {
    return {
      PostgreSQL: 0.3,
      "SQL Optimization": 0.25,
      "Database Design": 0.2,
      "Backup & Recovery": 0.15,
      "Performance Tuning": 0.1,
    };
  }
  
  if (n.includes("mobile")) {
    return {
      "React Native": 0.3,
      TypeScript: 0.25,
      "iOS/Android": 0.2,
      "State Management": 0.15,
      "Testing": 0.1,
    };
  }
  
  // 默认通用技术栈
  return {
    "General Programming": 0.4,
    "Problem Solving": 0.3,
    "System Design": 0.3,
  };
}

// 随机生成技术栈
function generateRandomStacks(): Record<string, number> {
  const allStacks = [
    "React", "Vue", "Angular", "Next.js", "TypeScript", "JavaScript",
    "Node.js", "Python", "Java", "Go", "Rust", "C++",
    "PostgreSQL", "MongoDB", "Redis", "MySQL",
    "Docker", "Kubernetes", "AWS", "GCP", "Azure",
    "GraphQL", "REST APIs", "Microservices", "CI/CD",
    "Testing", "DevOps", "System Design", "Algorithms",
  ];
  
  const count = Math.floor(Math.random() * 4) + 3; // 3-6 个技术栈
  const selected = allStacks.sort(() => Math.random() - 0.5).slice(0, count);
  
  // 生成权重，总和为 1
  const weights = selected.map(() => Math.random());
  const total = weights.reduce((sum, w) => sum + w, 0);
  const normalized = weights.map(w => Number((w / total).toFixed(2)));
  
  const result: Record<string, number> = {};
  selected.forEach((stack, i) => {
    result[stack] = normalized[i]!;
  });
  
  return result;
}

export function AddRoleForm({ onComplete, onCancel }: AddRoleFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<RoleFormData>({
    name: "",
    interviewerStyle: "gentle",
    requiredStacks: {},
  });
  
  // 技术栈输入状态
  const [stackEntries, setStackEntries] = useState<Array<{ tech: string; weight: number }>>([]);

  const githubUrlError = useMemo(() => {
    const url = formData.assignmentGithubLink?.trim() ?? "";
    if (!url) return "GitHub URL is required.";
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:") return "Must start with https://";
      if (parsed.hostname !== "github.com") return "Must be a github.com URL.";
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts.length < 2)
        return "Must be a repo URL like https://github.com/org/repo";
      return null;
    } catch {
      return "Please enter a valid URL.";
    }
  }, [formData.assignmentGithubLink]);

  const companyCultureError = useMemo(() => {
    const culture = formData.companyCulture?.trim() ?? "";
    if (!culture) return "Company culture/story is required.";
    return null;
  }, [formData.companyCulture]);

  const companyInfoError = useMemo(() => {
    const info = formData.companyInfo?.trim() ?? "";
    if (!info) return "Company info is required.";
    return null;
  }, [formData.companyInfo]);

  const updateFormData = (updates: Partial<RoleFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  // 当角色名称改变时，自动填充技术栈
  const handleRoleNameChange = (name: string) => {
    updateFormData({ name });
    if (name && stackEntries.length === 0) {
      const autoStacks = getStacksFromRoleName(name);
      const entries = Object.entries(autoStacks).map(([tech, weight]) => ({
        tech,
        weight,
      }));
      setStackEntries(entries);
      updateFormData({ requiredStacks: autoStacks });
    }
  };

  // 添加技术栈条目
  const addStackEntry = () => {
    setStackEntries([...stackEntries, { tech: "", weight: 0 }]);
  };

  // 删除技术栈条目
  const removeStackEntry = (index: number) => {
    const newEntries = stackEntries.filter((_, i) => i !== index);
    setStackEntries(newEntries);
    updateRequiredStacks(newEntries);
  };

  // 更新技术栈条目
  const updateStackEntry = (index: number, field: "tech" | "weight", value: string | number) => {
    const newEntries = [...stackEntries];
    newEntries[index] = {
      ...newEntries[index]!,
      [field]: value,
    };
    setStackEntries(newEntries);
    updateRequiredStacks(newEntries);
  };

  // 更新 requiredStacks
  const updateRequiredStacks = (entries: Array<{ tech: string; weight: number }>) => {
    const stacks: Record<string, number> = {};
    entries.forEach((entry) => {
      if (entry.tech.trim() && entry.weight > 0) {
        stacks[entry.tech.trim()] = entry.weight;
      }
    });
    updateFormData({ requiredStacks: stacks });
  };

  // 自动填充技术栈（根据角色名称）
  const handleAutoFill = () => {
    if (!formData.name) return;
    const autoStacks = getStacksFromRoleName(formData.name);
    const entries = Object.entries(autoStacks).map(([tech, weight]) => ({
      tech,
      weight,
    }));
    setStackEntries(entries);
    updateFormData({ requiredStacks: autoStacks });
  };

  // 随机填充技术栈
  const handleRandomFill = () => {
    const randomStacks = generateRandomStacks();
    const entries = Object.entries(randomStacks).map(([tech, weight]) => ({
      tech,
      weight,
    }));
    setStackEntries(entries);
    updateFormData({ requiredStacks: randomStacks });
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    if (!ROLE_NAME_OPTIONS.includes(formData.name as RoleNameOption)) return;
    onComplete(formData);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return ROLE_NAME_OPTIONS.includes(formData.name as RoleNameOption);
      case 2:
        return companyInfoError === null && companyCultureError === null;
      case 3:
        return githubUrlError === null;
      case 4:
        return (
          formData.requiredStacks &&
          Object.keys(formData.requiredStacks).length > 0
        );
      case 5:
        return true;
      case 6:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex flex-1 items-center">
            <div className="flex flex-1 flex-col items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                  currentStep > step.id
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : currentStep === step.id
                      ? "border-cyan-400 bg-cyan-400/10 text-cyan-400"
                      : "border-zinc-700 bg-zinc-900 text-zinc-500"
                }`}
              >
                {currentStep > step.id ? (
                  <Check className="h-5 w-5" />
                ) : (
                  step.id
                )}
              </div>
              <span
                className={`mt-2 text-xs ${
                  currentStep === step.id ? "text-zinc-200" : "text-zinc-500"
                }`}
              >
                {step.title}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`mx-2 h-0.5 flex-1 ${
                  currentStep > step.id ? "bg-emerald-600" : "bg-zinc-800"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Form Content */}
      <Card className="border border-zinc-800 bg-zinc-900">
        <CardContent className="p-6">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-400">
                    Role Name <span className="text-red-400">*</span>
                  </label>
                  <Select
                    value={formData.name}
                    onValueChange={handleRoleNameChange}
                  >
                    <SelectTrigger className="border-zinc-800 bg-zinc-950 text-zinc-100">
                      <SelectValue placeholder="Choose a role" />
                    </SelectTrigger>
                    <SelectContent className="border-zinc-800 bg-zinc-900">
                      {ROLE_NAME_OPTIONS.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-400">
                    Company Info <span className="text-red-400">*</span>
                  </label>
                  <Input
                    value={formData.companyInfo || ""}
                    onChange={(e) =>
                      updateFormData({ companyInfo: e.target.value })
                    }
                    placeholder="e.g., TechCorp Inc."
                    className="border-zinc-800 bg-zinc-950 text-zinc-100"
                  />
                  {companyInfoError && (
                    <p className="mt-2 text-xs text-red-400">
                      {companyInfoError}
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-400">
                    Upload Company Code (Optional)
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept=".js,.ts,.jsx,.tsx,.py"
                      onChange={(e) =>
                        updateFormData({
                          companyCode: e.target.files?.[0] || null,
                        })
                      }
                      className="border-zinc-800 bg-zinc-950 text-zinc-100"
                    />
                    {formData.companyCode && (
                      <span className="text-xs text-zinc-400">
                        {formData.companyCode.name}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-400">
                    Company Culture / Story{" "}
                    <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={formData.companyCulture || ""}
                    onChange={(e) =>
                      updateFormData({ companyCulture: e.target.value })
                    }
                    placeholder="Tell us about your company culture..."
                    className="min-h-[100px] w-full resize-none rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100"
                  />
                  {companyCultureError && (
                    <p className="mt-2 text-xs text-red-400">
                      {companyCultureError}
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-400">
                    Assignment GitHub Link{" "}
                    <span className="text-red-400">*</span>
                  </label>
                  <Input
                    value={formData.assignmentGithubLink || ""}
                    onChange={(e) =>
                      updateFormData({
                        assignmentGithubLink: e.target.value,
                      })
                    }
                    placeholder="https://github.com/company/challenge"
                    className="border-zinc-800 bg-zinc-950 text-zinc-100"
                  />
                  {githubUrlError && (
                    <p className="mt-2 text-xs text-red-400">
                      {githubUrlError}
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="block text-sm font-medium text-zinc-400">
                      Required Tech Stacks <span className="text-red-400">*</span>
                    </label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAutoFill}
                        disabled={!formData.name}
                        className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                      >
                        <Sparkles className="mr-1 h-3 w-3" />
                        Auto Fill
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRandomFill}
                        className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                      >
                        <Shuffle className="mr-1 h-3 w-3" />
                        Random
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {stackEntries.map((entry, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={entry.tech}
                          onChange={(e) =>
                            updateStackEntry(index, "tech", e.target.value)
                          }
                          placeholder="Technology name (e.g., React)"
                          className="flex-1 border-zinc-800 bg-zinc-950 text-zinc-100"
                        />
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          value={entry.weight}
                          onChange={(e) =>
                            updateStackEntry(
                              index,
                              "weight",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          placeholder="Weight"
                          className="w-24 border-zinc-800 bg-zinc-950 text-zinc-100"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeStackEntry(index)}
                          className="text-zinc-400 hover:text-red-400"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addStackEntry}
                      className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Tech Stack
                    </Button>
                  </div>
                  
                  {Object.keys(formData.requiredStacks || {}).length === 0 && (
                    <p className="text-xs text-yellow-400">
                      At least one tech stack is required
                    </p>
                  )}
                  
                  {Object.keys(formData.requiredStacks || {}).length > 0 && (
                    <div className="mt-4 rounded-md border border-zinc-800 bg-zinc-950 p-3">
                      <p className="mb-2 text-xs font-medium text-zinc-400">
                        Preview (Total:{" "}
                        {Object.values(formData.requiredStacks || {}).reduce(
                          (sum, w) => sum + w,
                          0,
                        ).toFixed(2)}
                        ):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(formData.requiredStacks || {}).map(
                          ([tech, weight]) => (
                            <span
                              key={tech}
                              className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300"
                            >
                              {tech}: {(weight * 100).toFixed(0)}%
                            </span>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {currentStep === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-400">
                    AI Interviewer Style *
                  </label>
                  <Select
                    value={formData.interviewerStyle}
                    onValueChange={(value) =>
                      updateFormData({
                        interviewerStyle: value as InterviewerStyle,
                      })
                    }
                  >
                    <SelectTrigger className="border-zinc-800 bg-zinc-950 text-zinc-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-zinc-800 bg-zinc-900">
                      <SelectItem value="gentle">Gentle</SelectItem>
                      <SelectItem value="strict">Strict</SelectItem>
                      <SelectItem value="mean">Mean</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-400">
                    Upload Historic Interview Transcript (Optional)
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept=".txt,.md,.pdf"
                      onChange={(e) =>
                        updateFormData({
                          historicTranscript: e.target.files?.[0] || null,
                        })
                      }
                      className="border-zinc-800 bg-zinc-950 text-zinc-100"
                    />
                    {formData.historicTranscript && (
                      <span className="text-xs text-zinc-400">
                        {formData.historicTranscript.name}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 6 && (
              <motion.div
                key="step6"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-semibold text-zinc-100">Preview</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-zinc-400">Role Name:</span>{" "}
                    <span className="text-zinc-200">{formData.name}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400">Company:</span>{" "}
                    <span className="text-zinc-200">
                      {formData.companyInfo || "Not set"}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400">Assignment:</span>{" "}
                    <span className="text-zinc-200">
                      {formData.assignmentGithubLink || "Not set"}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400">Tech Stacks:</span>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {Object.entries(formData.requiredStacks || {}).map(
                        ([tech, weight]) => (
                          <span
                            key={tech}
                            className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300"
                          >
                            {tech}: {(weight * 100).toFixed(0)}%
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-zinc-400">Interviewer Style:</span>{" "}
                    <span className="text-zinc-200 capitalize">
                      {formData.interviewerStyle}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={currentStep === 1 ? onCancel : handleBack}
          className="border-zinc-800 text-zinc-400 hover:bg-zinc-900"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {currentStep === 1 ? "Cancel" : "Back"}
        </Button>
        {currentStep < steps.length ? (
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="bg-linear-to-r from-cyan-600 to-emerald-600 text-white hover:from-cyan-500 hover:to-emerald-500 disabled:opacity-50"
          >
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            className="bg-linear-to-r from-cyan-600 to-emerald-600 text-white hover:from-cyan-500 hover:to-emerald-500"
          >
            Publish
            <Check className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
