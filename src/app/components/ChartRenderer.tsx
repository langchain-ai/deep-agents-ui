"use client";

import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

type ChartType = "bar" | "line" | "pie";

interface ChartRendererProps {
  columns: string[];
  rows: string[][];
}

/** 尝试将字符串转为数值，去掉 % , 等符号 */
function parseNumeric(val: string): number | null {
  if (!val || val.trim() === "") return null;
  const cleaned = val.replace(/[,%]/g, "").trim();
  const num = Number(cleaned);
  return isNaN(num) ? null : num;
}

/** 判断某列是否为数值列（超过一半的行能解析为数字） */
function isNumericColumn(rows: string[][], colIndex: number): boolean {
  if (rows.length === 0) return false;
  let numericCount = 0;
  for (const row of rows) {
    if (row[colIndex] !== undefined && parseNumeric(row[colIndex]) !== null) {
      numericCount++;
    }
  }
  return numericCount > rows.length * 0.5;
}

export const ChartRenderer = React.memo<ChartRendererProps>(
  ({ columns, rows }) => {
    const [chartType, setChartType] = useState<ChartType>("bar");

    // 识别维度列（第一个非数值列）和指标列（数值列）
    const { categoryIndex, valueIndices } = useMemo(() => {
      const valIdxs: number[] = [];
      for (let i = 0; i < columns.length; i++) {
        if (isNumericColumn(rows, i)) {
          valIdxs.push(i);
        }
      }
      // 第一个非数值列作为分类轴
      const catIdx = columns.findIndex((_, i) => !valIdxs.includes(i));
      return {
        categoryIndex: catIdx === -1 ? 0 : catIdx,
        valueIndices: valIdxs.length > 0 ? valIdxs : [1],
      };
    }, [columns, rows]);

    const categories = rows.map((row) => row[categoryIndex] || "");

    const option = useMemo(() => {
      if (chartType === "pie") {
        const vIdx = valueIndices[0];
        const data = rows.map((row) => ({
          name: row[categoryIndex] || "",
          value: parseNumeric(row[vIdx]) ?? 0,
        }));
        return {
          tooltip: { trigger: "item" as const, formatter: "{b}: {c} ({d}%)" },
          legend: { bottom: 0, type: "scroll" as const },
          series: [
            {
              type: "pie" as const,
              radius: ["35%", "60%"],
              data,
              label: { formatter: "{b}\n{d}%" },
            },
          ],
        };
      }

      // 折线图 / 柱形图
      const series = valueIndices.map((vIdx) => ({
        name: columns[vIdx],
        type: chartType as "bar" | "line",
        data: rows.map((row) => parseNumeric(row[vIdx]) ?? 0),
        smooth: chartType === "line",
      }));

      return {
        tooltip: { trigger: "axis" as const },
        legend: { bottom: 0, type: "scroll" as const },
        grid: { left: "3%", right: "4%", bottom: "15%", containLabel: true },
        xAxis: {
          type: "category" as const,
          data: categories,
          axisLabel: { rotate: categories.length > 6 ? 30 : 0 },
        },
        yAxis: { type: "value" as const },
        series,
      };
    }, [chartType, columns, rows, categories, categoryIndex, valueIndices]);

    // 数据不足时不渲染图表
    if (rows.length < 1 || valueIndices.length === 0) return null;

    const buttons: { type: ChartType; label: string }[] = [
      { type: "bar", label: "柱形图" },
      { type: "line", label: "折线图" },
      { type: "pie", label: "饼图" },
    ];

    return (
      <div className="my-4 rounded-lg border border-border p-3">
        <div className="mb-2 flex gap-2">
          {buttons.map((btn) => (
            <button
              key={btn.type}
              onClick={() => setChartType(btn.type)}
              className={`rounded px-3 py-1 text-xs transition-colors ${
                chartType === btn.type
                  ? "text-primary-foreground bg-primary"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
        <ReactECharts
          option={option}
          style={{ height: 350, width: "100%" }}
          notMerge
        />
      </div>
    );
  }
);

ChartRenderer.displayName = "ChartRenderer";
