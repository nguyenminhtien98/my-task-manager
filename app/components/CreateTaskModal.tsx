import React from 'react';
import { useForm, SubmitHandler } from "react-hook-form";
import ModalComponent from './ModalComponent';
import {
    CreateTaskFormValues, CreateTaskModalProps, Task, IssueType,
    Priority,
} from '../types/taskTypes';
import PriorityDropdown from './CutomDropdown/PriorityDropdown';
import IssueTypeDropdown from './CutomDropdown/IssueTypeDropdown';

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ isOpen, setIsOpen, onCreate }) => {
    const { register, handleSubmit, reset, setValue, watch } = useForm<CreateTaskFormValues>({
        defaultValues: {
            issueType: "Feature",
            priority: "Medium",
        },
    });

    const issueType = watch("issueType");
    const priority = watch("priority");

    const onSubmit: SubmitHandler<CreateTaskFormValues> = data => {
        const newTask: Task = {
            id: Date.now().toString(),
            seq: Date.now(),
            title: data.title,
            description: data.description,
            assignee: data.assignee,
            status: 'list',
            order: 0,
            startDate: data.startDate,
            endDate: data.endDate,
            predictedHours: data.predictedHours,
            issueType: data.issueType,
            priority: data.priority,
        };
        onCreate(newTask);
        reset({ title: '', description: '', assignee: '', startDate: '', endDate: '', predictedHours: 0, issueType: 'Feature', priority: 'Medium' });
        setIsOpen(false);
    };

    return (
        <ModalComponent isOpen={isOpen} setIsOpen={setIsOpen} title="Tạo Task">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Tiêu đề</label>
                    <input
                        type="text"
                        {...register("title", { required: true })}
                        className="mt-1 block w-full rounded border-gray-300 shadow-sm"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Nội dung chi tiết</label>
                    <textarea
                        {...register("description", { required: true })}
                        className="mt-1 block w-full rounded border-gray-300 shadow-sm"
                    ></textarea>
                </div>
                <div className='flex gap-[10px]'>
                    <div className='w-[50%]'>
                        <label className="block text-sm font-medium">Issue Type</label>
                        <IssueTypeDropdown
                            value={issueType}
                            onChange={(val) => setValue("issueType", val as IssueType)}
                        />
                    </div>
                    <div className='w-[50%]'>
                        <label className="block text-sm font-medium">Priority</label>
                        <PriorityDropdown
                            value={priority}
                            onChange={(val) => setValue("priority", val as Priority)}
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Người thực hiện</label>
                    <input
                        type="text"
                        {...register("assignee", { required: true })}
                        className="mt-1 block w-full rounded border-gray-300 shadow-sm"
                    />
                </div>
                <div className='flex gap-[10px]'>
                    <div className='w-[50%]'>
                        <label className="block text-sm font-medium text-gray-700">Ngày bắt đầu</label>
                        <input
                            type="date"
                            {...register("startDate", { required: true })}
                            className="mt-1 block w-full rounded border-gray-300 shadow-sm"
                        />
                    </div>
                    <div className='w-[50%]'>
                        <label className="block text-sm font-medium text-gray-700">Ngày kết thúc</label>
                        <input
                            type="date"
                            {...register("endDate", { required: true })}
                            className="mt-1 block w-full rounded border-gray-300 shadow-sm"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Số giờ dự kiến hoàn thành</label>
                    <input
                        type="number"
                        {...register("predictedHours", { required: true, valueAsNumber: true })}
                        className="mt-1 block w-full rounded border-gray-300 shadow-sm"
                    />
                </div>
                <div className="flex justify-end space-x-4">
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="px-4 py-2 bg-gray-300 rounded"
                    >
                        Hủy
                    </button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
                        Tạo
                    </button>
                </div>
            </form>
        </ModalComponent>
    );
};

export default CreateTaskModal;
