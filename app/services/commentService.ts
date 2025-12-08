"use client";

import axiosInstance, { ApiResponse } from "@/lib/axios";
import type {
  Comment,
  CommentPagination,
  CreateCommentPayload,
  UpdateCommentPayload,
  GetCommentsResponse,
} from "../types/Types";

export const getComments = async (
  taskId: string,
  page: number = 1,
  limit: number = 20
): Promise<GetCommentsResponse> => {
  const response = await axiosInstance.get<
    ApiResponse<Comment[]> & { pagination: CommentPagination }
  >(`/tasks/${taskId}/comments`, {
    params: { page, limit },
  });

  return {
    comments: response.data.data,
    pagination: response.data.pagination,
  };
};

export const createComment = async (
  taskId: string,
  payload: CreateCommentPayload
): Promise<Comment> => {
  const response = await axiosInstance.post<ApiResponse<Comment>>(
    `/tasks/${taskId}/comments`,
    payload
  );
  return response.data.data;
};

export const updateComment = async (
  commentId: string,
  payload: UpdateCommentPayload
): Promise<Comment> => {
  const response = await axiosInstance.put<ApiResponse<Comment>>(
    `/comments/${commentId}`,
    payload
  );
  return response.data.data;
};

export const deleteComment = async (commentId: string): Promise<void> => {
  await axiosInstance.delete(`/comments/${commentId}`);
};
